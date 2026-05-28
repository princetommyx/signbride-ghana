import os
import json
from PIL import Image

OUTPUT_DIR = "src/assets/signs"
OUTPUT_JSON = "src/assets/data/gsl_dictionary.json"
MIN_CROP_WIDTH = 50
MIN_CROP_HEIGHT = 50

def validate():
    if not os.path.exists(OUTPUT_JSON):
        print("Dictionary JSON not found!")
        return

    with open(OUTPUT_JSON, 'r', encoding='utf-8') as f:
        data = json.load(f)

    valid_data = []
    # Merge duplicates based on word
    merged_data = {}
    
    for entry in data:
        word = entry["word"].upper()
        image_path = os.path.join(os.getcwd(), "src", entry["image"])
        
        # Check if image exists
        if not os.path.exists(image_path):
            print(f"Warning: Image {entry['image']} missing for {word}")
            continue
            
        # Check image size
        try:
            with Image.open(image_path) as img:
                if img.width < MIN_CROP_WIDTH or img.height < MIN_CROP_HEIGHT:
                    print(f"Warning: Image for {word} is too small ({img.width}x{img.height})")
                    continue
        except Exception as e:
            print(f"Warning: Could not open image for {word}: {e}")
            continue
            
        if word in merged_data:
            # Add to images array if not present, and handle existing images list
            if "images" not in merged_data[word]:
                merged_data[word]["images"] = [merged_data[word]["image"]]
            
            if entry["image"] not in merged_data[word]["images"]:
                merged_data[word]["images"].append(entry["image"])
                
            # Append description if unique
            if entry["description"] and entry["description"] not in merged_data[word]["description"]:
                merged_data[word]["description"] += " | " + entry["description"]
        else:
            merged_data[word] = entry
            merged_data[word]["images"] = [entry["image"]]
            
    final_data = list(merged_data.values())
    
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(final_data, f, indent=2)
        
    print(f"Validation complete. Final dictionary size: {len(final_data)}")

if __name__ == "__main__":
    validate()
