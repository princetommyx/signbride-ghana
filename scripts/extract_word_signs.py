import pdfplumber
import os
import json
import re
from PIL import Image

PDF_PATH = "Ghanaian Sign Language Dictionary - 3rd Edition.pdf"
OUTPUT_DIR = "src/assets/signs"
OUTPUT_JSON = "src/assets/data/gsl_dictionary.json"
SKIP_WORDS = {
    "FAMILY, PEOPLE AND PRONOUNS", "GRAMMAR AND PARTS OF SPEECH", 
    "HOME AND CLOTHING", "GREETINGS", "FOOD", "NATURE AND THE ENVIRONMENT", 
    "ACTIVITIES", "SPORTS AND GAMES", "SCIENCE AND NATURE", "OPPOSITES AND QUESTIONS"
}

def clean_word(text):
    return re.sub(r'[^A-Z\s\-]', '', text).strip()

def process_pdf():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    
    dictionary_data = []
    
    with pdfplumber.open(PDF_PATH) as pdf:
        print(f"Total pages: {len(pdf.pages)}")
        
        for page_num in range(20, len(pdf.pages)):
            page = pdf.pages[page_num]
            
            words = page.extract_words(keep_blank_chars=True)
            if not words:
                continue
                
            titles = []
            lines = {}
            for w in words:
                y0 = round(w['top'], 1)
                found = False
                for ly in lines.keys():
                    if abs(ly - y0) < 5:
                        lines[ly].append(w)
                        found = True
                        break
                if not found:
                    lines[y0] = [w]
            
            sorted_y = sorted(lines.keys())
            
            for y0 in sorted_y:
                line_words = sorted(lines[y0], key=lambda x: x['x0'])
                text = " ".join([w['text'] for w in line_words]).strip()
                
                # Exclude skip words and page headers
                if text.isupper() and len(text) > 1 and text not in SKIP_WORDS:
                    if any(c.isalpha() for c in text):
                        bbox = (line_words[0]['x0'], min([w['top'] for w in line_words]),
                                line_words[-1]['x1'], max([w['bottom'] for w in line_words]))
                        titles.append({"text": text, "bbox": bbox, "y0": y0, "line_words": line_words})
            
            if not titles:
                continue
                
            mid_x = page.width / 2
            col1 = [t for t in titles if t['bbox'][0] < mid_x]
            col2 = [t for t in titles if t['bbox'][0] >= mid_x]
            
            col1 = sorted(col1, key=lambda x: x['y0'])
            col2 = sorted(col2, key=lambda x: x['y0'])
            
            def process_column(col_titles, is_col1):
                for i, title in enumerate(col_titles):
                    word_clean = clean_word(title["text"])
                    if not word_clean: continue
                    
                    top_y = title["bbox"][1]
                    crop_y0 = max(0, top_y - 5)
                    
                    if i + 1 < len(col_titles):
                        crop_y1 = col_titles[i+1]["bbox"][1] - 5
                    else:
                        lowest_y = top_y
                        for y in sorted_y:
                            if y > top_y:
                                for w in lines[y]:
                                    if (is_col1 and w['x0'] < mid_x) or (not is_col1 and w['x0'] >= mid_x):
                                        lowest_y = max(lowest_y, w['bottom'])
                        crop_y1 = min(page.height, lowest_y + 10)
                        
                    crop_x0 = 0 if is_col1 else mid_x
                    crop_x1 = mid_x if is_col1 else page.width
                    
                    if crop_y1 <= crop_y0 or crop_x1 <= crop_x0:
                        continue
                        
                    crop_box = (crop_x0, crop_y0, crop_x1, crop_y1)
                    
                    try:
                        cropped = page.crop(crop_box)
                        img_obj = cropped.to_image(resolution=200)
                        
                        safe_name = re.sub(r'[^a-z0-9]', '_', word_clean.lower())
                        count = 1
                        fname = f"{safe_name}.png"
                        while os.path.exists(os.path.join(OUTPUT_DIR, fname)):
                            fname = f"{safe_name}_{count}.png"
                            count += 1
                            
                        img_path = os.path.join(OUTPUT_DIR, fname)
                        img_obj.save(img_path)
                        
                        desc_words = []
                        for y in sorted_y:
                            if y > title["bbox"][3] and y < crop_y1:
                                for w in lines[y]:
                                    if (is_col1 and w['x0'] < mid_x) or (not is_col1 and w['x0'] >= mid_x):
                                        desc_words.append((w['x0'], w['text']))
                        
                        description = " ".join([text for _, text in desc_words]).strip()
                        
                        dictionary_data.append({
                            "word": word_clean.title(),
                            "description": description,
                            "image": f"assets/signs/{fname}",
                            "page": page_num,
                            "letter": word_clean[0].upper() if word_clean else "",
                            "aliases": [],
                            "tags": []
                        })
                        print(f"Extracted {word_clean} from page {page_num}")
                    except Exception as e:
                        print(f"Error cropping {word_clean} on page {page_num}: {e}")

            process_column(col1, True)
            process_column(col2, False)

    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(dictionary_data, f, indent=2)
        
    print(f"Saved {len(dictionary_data)} entries to {OUTPUT_JSON}")

if __name__ == "__main__":
    process_pdf()
