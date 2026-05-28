import pdfplumber

def test_pdf():
    pdf_path = "Ghanaian Sign Language Dictionary - 3rd Edition.pdf"
    with pdfplumber.open(pdf_path) as pdf:
        # Check a few pages
        for i in range(25, 30):
            page = pdf.pages[i]
            words = page.extract_words()
            images = page.images
            print(f"Page {i}: {len(words)} words, {len(images)} images")
            if images:
                for idx, img in enumerate(images):
                    print(f"  Image {idx}: bbox=({img['x0']}, {img['top']}, {img['x1']}, {img['bottom']}), width={img['width']}, height={img['height']}")

if __name__ == "__main__":
    test_pdf()
