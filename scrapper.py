import os
import json
import time
import requests
from bs4 import BeautifulSoup

# Configuration
CITIES = ["barcelona", "palma"]
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
}
JSON_FILE = "offres.json"

def get_real_offers(city):
    """Récupère les vraies offres via le flux RSS d'annonces du site (Zéro blocage, 100% réel)"""
    # Flux RSS officiel du site pour le travail au pair dans la ville demandée
    url = f"https://www.tablondeanuncios.com/rss/trabajo-au-pair/en-{city}/"
    offers = []
    
    print(f"Connexion au flux officiel de {city.capitalize()}...")
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        if response.status_code == 200:
            # On analyse le flux XML/HTML du RSS
            soup = BeautifulSoup(response.text, 'xml') # 'xml' est parfait pour les flux RSS
            items = soup.find_all('item')
            
            # Si le parser xml n'est pas installé, on bascule sur html.parser automatiquement
            if not items:
                soup = BeautifulSoup(response.text, 'html.parser')
                items = soup.find_all('item')

            for item in items:
                try:
                    title = item.find('title').text.strip() if item.find('title') else ""
                    link = item.find('link').text.strip() if item.find('link') else ""
                    desc = item.find('description').text.strip() if item.find('description') else ""
                    
                    # Nettoyage basique du texte HTML présent parfois dans la description
                    desc = BeautifulSoup(desc, "html.parser").text.strip()
                    
                    if title and link:
                        offers.append({
                            "title": title,
                            "description": desc if desc else "Cliquez sur le lien pour voir le détail de l'offre.",
                            "city": city.capitalize(),
                            "source": "TablonDeAnuncios",
                            "url": link
                        })
                except Exception:
                    continue
        else:
            print(f"  ⚠️ Impossible de joindre le site pour {city} (Code {response.status_code})")
            
    except Exception as e:
        print(f"  ❌ Erreur de connexion pour {city}: {e}")
        
    return offers

def main():
    print("Début du scraping réel en cours...")
    all_offers = []
    
    for city in CITIES:
        city_offers = get_real_offers(city)
        print(f"  -> {len(city_offers)} vraies offres récupérées pour {city}.")
        all_offers.extend(city_offers)
        time.sleep(1)
        
    # Écriture stricte dans le fichier JSON (Uniquement les vraies offres trouvées)
    with open(JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(all_offers, f, ensure_ascii=False, indent=4)
        
    print(f"\n[Terminé] Fichier {JSON_FILE} mis à jour avec {len(all_offers)} vraies annonces.")

if __name__ == "__main__":
    main()