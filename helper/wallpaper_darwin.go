//go:build darwin

package main

import (
	"fmt"
	"os/exec"
	"strings"
)

func systemName() string { return "mac" }

func notify(string) {}

const appKitScript = `
use framework "AppKit"
use scripting additions
on run argv
    set imagePath to item 1 of argv
    set imageURL to current application's NSURL's fileURLWithPath:imagePath
    set workspace to current application's NSWorkspace's sharedWorkspace()
    set screens to current application's NSScreen's screens()
    if (count of screens) is 0 then error "没有找到显示器"
    repeat with sc in screens
        set outcome to workspace's setDesktopImageURL:imageURL forScreen:sc options:(current application's NSDictionary's dictionary()) |error|:(reference)
        set didSet to item 1 of outcome
        if didSet as boolean is false then
            set errObj to item 2 of outcome
            if errObj is missing value then error "系统没有接受这张壁纸"
            error (errObj's localizedDescription() as text)
        end if
    end repeat
end run
`

func setDesktop(path string) error {
	proc := exec.Command("osascript", "-e", appKitScript, path)
	out, err := proc.CombinedOutput()
	if err == nil {
		return nil
	}
	text := strings.Join(strings.Fields(string(out)), " ")
	lower := strings.ToLower(text)
	if strings.Contains(text, "-1743") || strings.Contains(text, "1002") || strings.Contains(lower, "not authorized") || strings.Contains(text, "不允许") {
		return fmt.Errorf("系统拦截了更换壁纸。请允许「终端」控制这台 Mac")
	}
	if text == "" {
		text = err.Error()
	}
	if len(text) > 280 {
		text = text[:280] + "…"
	}
	return fmt.Errorf("更换失败：%s", text)
}
