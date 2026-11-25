package main

import (
	"bytes"
	"image"
	"image/color"
	"image/png"
	"testing"
)

func TestEncodeBMP(t *testing.T) {
	img := image.NewNRGBA(image.Rect(0, 0, 2, 2))
	img.Set(0, 0, color.RGBA{R: 255, A: 255})
	img.Set(1, 1, color.RGBA{B: 255, A: 255})
	var raw bytes.Buffer
	if err := png.Encode(&raw, img); err != nil {
		t.Fatal(err)
	}
	bmp, err := pngToBMP(raw.Bytes())
	if err != nil {
		t.Fatal(err)
	}
	if string(bmp[:2]) != "BM" {
		t.Fatalf("header = %q", bmp[:2])
	}
	if bmp[0x1C] != 24 || bmp[0x1D] != 0 {
		t.Fatalf("bit count = %d", int(bmp[0x1C])|int(bmp[0x1D])<<8)
	}
	// Bottom-up: first stored row is y=1. Pixel (1,1) is blue.
	pixel := bmp[54+3]
	if pixel != 255 {
		t.Fatalf("blue channel = %d", pixel)
	}
}
