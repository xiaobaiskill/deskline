package main

import (
	"bytes"
	"encoding/binary"
	"image"
	"image/png"
)

func encodeBMP(img image.Image) ([]byte, error) {
	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()
	if width <= 0 || height <= 0 {
		return nil, errEmptyImage
	}
	stride := (width*3 + 3) &^ 3
	const header = 14 + 40
	size := header + stride*height
	buf := make([]byte, size)
	buf[0], buf[1] = 'B', 'M'
	binary.LittleEndian.PutUint32(buf[2:], uint32(size))
	binary.LittleEndian.PutUint32(buf[10:], header)
	binary.LittleEndian.PutUint32(buf[14:], 40)
	binary.LittleEndian.PutUint32(buf[18:], uint32(width))
	binary.LittleEndian.PutUint32(buf[22:], uint32(height))
	binary.LittleEndian.PutUint16(buf[26:], 1)
	binary.LittleEndian.PutUint16(buf[28:], 24)

	offset := header
	for y := bounds.Max.Y - 1; y >= bounds.Min.Y; y-- {
		row := buf[offset : offset+stride]
		i := 0
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			r, g, b, _ := img.At(x, y).RGBA()
			row[i] = byte(b >> 8)
			row[i+1] = byte(g >> 8)
			row[i+2] = byte(r >> 8)
			i += 3
		}
		offset += stride
	}
	return buf, nil
}

func pngToBMP(data []byte) ([]byte, error) {
	img, err := png.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	return encodeBMP(img)
}
