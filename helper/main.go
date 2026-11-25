package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"syscall"
	"time"
)

const (
	listenAddr = "127.0.0.1:47321"
	maxBytes   = 40 << 20
)

var errEmptyImage = errors.New("图片是空的")

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/health", handleHealth)
	mux.HandleFunc("/wallpaper", handleWallpaper)
	server := &http.Server{
		Addr:              listenAddr,
		Handler:           withCORS(mux),
		ReadHeaderTimeout: 10 * time.Second,
	}
	listener, err := net.Listen("tcp", listenAddr)
	if err != nil {
		if isAddrInUse(err) {
			notify("换屏小助手已经在后台运行。回到网页点「更换屏幕」即可。")
		} else {
			fmt.Println(err)
		}
		os.Exit(1)
	}
	fmt.Printf("Deskline 换屏小助手  http://%s\n", listenAddr)
	go func() {
		serveErr := server.Serve(listener)
		if serveErr != nil && !errors.Is(serveErr, http.ErrServerClosed) {
			fmt.Println(serveErr)
		}
	}()
	notify("换屏小助手已在后台运行。回到网页再点「更换屏幕」。")
	select {}
}

func isAddrInUse(err error) bool {
	return errors.Is(err, syscall.EADDRINUSE)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = "*"
		}
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Vary", "Origin")
		w.Header().Set("Access-Control-Allow-Private-Network", "true")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"ok": false, "error": "请使用 GET"})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "system": systemName()})
}

func handleWallpaper(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]any{"ok": false, "error": "请使用 POST"})
		return
	}
	data, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxBytes))
	if err != nil {
		writeJSON(w, http.StatusRequestEntityTooLarge, map[string]any{"ok": false, "error": "图片为空或太大"})
		return
	}
	if len(data) <= 8 || !bytesHasPNG(data) {
		writeJSON(w, http.StatusBadRequest, map[string]any{"ok": false, "error": "需要 PNG 图片"})
		return
	}
	path, err := saveWallpaper(data)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"ok": false, "error": err.Error()})
		return
	}
	if err = setDesktop(path); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]any{"ok": false, "error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "path": path})
}

func bytesHasPNG(data []byte) bool {
	return len(data) >= 8 && string(data[:8]) == "\x89PNG\r\n\x1a\n"
}

func wallpaperDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	dir := filepath.Join(home, "Pictures", "Deskline")
	if err = os.MkdirAll(dir, 0o755); err != nil {
		return "", err
	}
	return dir, nil
}

func saveWallpaper(data []byte) (string, error) {
	dir, err := wallpaperDir()
	if err != nil {
		return "", err
	}
	stamp := time.Now().Format("20060102-150405")
	path := filepath.Join(dir, "wallpaper-"+stamp+".png")
	for seq := 2; ; seq++ {
		if _, statErr := os.Stat(path); os.IsNotExist(statErr) {
			break
		}
		path = filepath.Join(dir, fmt.Sprintf("wallpaper-%s-%d.png", stamp, seq))
	}
	if err = os.WriteFile(path, data, 0o644); err != nil {
		return "", err
	}
	prune(dir, "wallpaper-*.png", 12)
	return path, nil
}

func prune(dir, pattern string, keep int) {
	matches, err := filepath.Glob(filepath.Join(dir, pattern))
	if err != nil || len(matches) <= keep {
		return
	}
	type item struct {
		path string
		mod  time.Time
	}
	files := make([]item, 0, len(matches))
	for _, match := range matches {
		info, statErr := os.Stat(match)
		if statErr != nil {
			continue
		}
		files = append(files, item{path: match, mod: info.ModTime()})
	}
	for i := 0; i < len(files); i++ {
		for j := i + 1; j < len(files); j++ {
			if files[j].mod.Before(files[i].mod) {
				files[i], files[j] = files[j], files[i]
			}
		}
	}
	for _, old := range files[:len(files)-keep] {
		_ = os.Remove(old.path)
	}
}

func writeJSON(w http.ResponseWriter, code int, payload map[string]any) {
	raw, _ := json.Marshal(payload)
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_, _ = w.Write(raw)
}
