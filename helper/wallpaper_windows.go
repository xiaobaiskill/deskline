//go:build windows

package main

import (
	"fmt"
	"os"
	"path/filepath"
	"syscall"
	"unsafe"
)

func systemName() string { return "windows" }

func notify(text string) {
	title, err := syscall.UTF16PtrFromString("Deskline")
	if err != nil {
		return
	}
	body, err := syscall.UTF16PtrFromString(text)
	if err != nil {
		return
	}
	messageBoxW.Call(0, uintptr(unsafe.Pointer(body)), uintptr(unsafe.Pointer(title)), 0x40)
}

var (
	user32                = syscall.NewLazyDLL("user32.dll")
	systemParametersInfoW = user32.NewProc("SystemParametersInfoW")
	messageBoxW           = user32.NewProc("MessageBoxW")
	advapi32              = syscall.NewLazyDLL("advapi32.dll")
	regOpenKeyExW         = advapi32.NewProc("RegOpenKeyExW")
	regSetValueExW        = advapi32.NewProc("RegSetValueExW")
	regCloseKey           = advapi32.NewProc("RegCloseKey")
)

const (
	spiSetDeskWallpaper = 0x0014
	spifUpdateIniFile   = 0x01
	spifSendChange      = 0x02
	hkeyCurrentUser     = 0x80000001
	keySetValue         = 0x0002
	regSz               = 1
)

func setDesktop(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	bmp, err := pngToBMP(data)
	if err != nil {
		return fmt.Errorf("Windows 没能读取这张图片")
	}
	bmpPath := filepath.Join(filepath.Dir(path), trimExt(filepath.Base(path))+".bmp")
	if err = os.WriteFile(bmpPath, bmp, 0o644); err != nil {
		return err
	}
	prune(filepath.Dir(path), "wallpaper-*.bmp", 12)
	setFillStyle()
	ptr, err := syscall.UTF16PtrFromString(bmpPath)
	if err != nil {
		return err
	}
	ret, _, callErr := systemParametersInfoW.Call(
		spiSetDeskWallpaper,
		0,
		uintptr(unsafe.Pointer(ptr)),
		spifUpdateIniFile|spifSendChange,
	)
	if ret == 0 {
		if callErr != nil && callErr != syscall.Errno(0) {
			return fmt.Errorf("更换失败：%s", callErr.Error())
		}
		return fmt.Errorf("系统没有接受这张壁纸")
	}
	return nil
}

func trimExt(name string) string {
	ext := filepath.Ext(name)
	return name[:len(name)-len(ext)]
}

func setFillStyle() {
	name, err := syscall.UTF16PtrFromString(`Control Panel\Desktop`)
	if err != nil {
		return
	}
	var key syscall.Handle
	ret, _, _ := regOpenKeyExW.Call(
		hkeyCurrentUser,
		uintptr(unsafe.Pointer(name)),
		0,
		keySetValue,
		uintptr(unsafe.Pointer(&key)),
	)
	if ret != 0 {
		return
	}
	defer regCloseKey.Call(uintptr(key))
	_ = setString(key, "WallpaperStyle", "10")
	_ = setString(key, "TileWallpaper", "0")
}

func setString(key syscall.Handle, name, value string) error {
	namePtr, err := syscall.UTF16PtrFromString(name)
	if err != nil {
		return err
	}
	data, err := syscall.UTF16FromString(value)
	if err != nil {
		return err
	}
	ret, _, callErr := regSetValueExW.Call(
		uintptr(key),
		uintptr(unsafe.Pointer(namePtr)),
		0,
		regSz,
		uintptr(unsafe.Pointer(&data[0])),
		uintptr(len(data)*2),
	)
	if ret != 0 {
		if callErr != nil && callErr != syscall.Errno(0) {
			return callErr
		}
		return fmt.Errorf("写入桌面设置失败")
	}
	return nil
}
