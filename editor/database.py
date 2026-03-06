import sqlite3
import os
from typing import List
from models import CardData
from config import get_app_path

class DatabaseManager:
    def __init__(self, db_name="cards.db"):
        self.db_path = os.path.join(get_app_path(), db_name)
        self.conn = sqlite3.connect(self.db_path)
        self.init_db()
        self.check_and_migrate()  # Nová metoda pro aktualizaci DB

    def init_db(self):
        with self.conn:
            self.conn.execute("""
                CREATE TABLE IF NOT EXISTS decks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL
                )
            """)
            # Vytvoříme tabulku se základy, pokud neexistuje
            self.conn.execute("""
                CREATE TABLE IF NOT EXISTS cards (
                    db_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    deck_id INTEGER,
                    card_number TEXT,
                    faction TEXT,
                    title TEXT,
                    type TEXT,
                    cost INTEGER,
                    defense INTEGER,
                    health INTEGER,
                    description TEXT,
                    image_prompt TEXT,
                    image_data BLOB,
                    img_scale REAL DEFAULT 1.0,
                    img_x INTEGER DEFAULT 0,
                    img_y INTEGER DEFAULT 0,
                    FOREIGN KEY(deck_id) REFERENCES decks(id) ON DELETE CASCADE
                )
            """)

    def check_and_migrate(self):
        """Přidá sloupce pro pozicování obrázku do starších databází."""
        cursor = self.conn.cursor()
        cursor.execute("PRAGMA table_info(cards)")
        columns = [info[1] for info in cursor.fetchall()]
        
        try:
            if "img_scale" not in columns:
                cursor.execute("ALTER TABLE cards ADD COLUMN img_scale REAL DEFAULT 1.0")
            if "img_x" not in columns:
                cursor.execute("ALTER TABLE cards ADD COLUMN img_x INTEGER DEFAULT 0")
            if "img_y" not in columns:
                cursor.execute("ALTER TABLE cards ADD COLUMN img_y INTEGER DEFAULT 0")
            self.conn.commit()
        except Exception as e:
            print(f"Migrace DB selhala (možná už sloupce existují): {e}")

    # ... get_decks a create_deck zůstávají stejné ...
    def get_decks(self):
        cursor = self.conn.cursor()
        cursor.execute("SELECT id, name FROM decks ORDER BY id")
        return cursor.fetchall()

    def create_deck(self, name: str) -> int:
        cursor = self.conn.cursor()
        cursor.execute("INSERT INTO decks (name) VALUES (?)", (name,))
        self.conn.commit()
        return cursor.lastrowid

    def get_cards(self, deck_id: int) -> List[CardData]:
        cursor = self.conn.cursor()
        # Načítáme i nové sloupce
        cursor.execute("SELECT * FROM cards WHERE deck_id = ? ORDER BY db_id", (deck_id,))
        cards = []
        for row in cursor.fetchall():
            # Ošetření pro případ, že v řádku chybí nové sloupce (pokud by select * zlobil)
            # Ale díky migraci by to mělo být OK.
            # Předpokládáme pořadí sloupců dle CREATE TABLE.
            # id=0, deck_id=1, num=2, fac=3, tit=4, typ=5, c=6, d=7, h=8, desc=9, prmpt=10, data=11, 
            # scale=12, x=13, y=14
            
            # Pokud jsou data NULL (staré záznamy), použijeme defaulty
            scale = row[12] if len(row) > 12 and row[12] is not None else 1.0
            ix = row[13] if len(row) > 13 and row[13] is not None else 0
            iy = row[14] if len(row) > 14 and row[14] is not None else 0

            cards.append(CardData(
                db_id=row[0], deck_id=row[1], card_number=row[2], faction=row[3],
                title=row[4], type=row[5], cost=row[6], defense=row[7],
                health=row[8], description=row[9], image_prompt=row[10], image_data=row[11],
                img_scale=scale, img_x=ix, img_y=iy
            ))
        return cards

    def save_card(self, card: CardData) -> int:
        cursor = self.conn.cursor()
        if card.db_id is None:
            cursor.execute("""
                INSERT INTO cards (deck_id, card_number, faction, title, type, cost, defense, health, description, image_prompt, image_data, img_scale, img_x, img_y)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (card.deck_id, card.card_number, card.faction, card.title, card.type, card.cost, card.defense, card.health, card.description, card.image_prompt, card.image_data, card.img_scale, card.img_x, card.img_y))
            card.db_id = cursor.lastrowid
        else:
            cursor.execute("""
                UPDATE cards SET card_number=?, faction=?, title=?, type=?, cost=?, defense=?, health=?, description=?, image_prompt=?, image_data=?, img_scale=?, img_x=?, img_y=?
                WHERE db_id=?
            """, (card.card_number, card.faction, card.title, card.type, card.cost, card.defense, card.health, card.description, card.image_prompt, card.image_data, card.img_scale, card.img_x, card.img_y, card.db_id))
        self.conn.commit()
        return card.db_id

    def delete_card(self, db_id: int):
        with self.conn:
            self.conn.execute("DELETE FROM cards WHERE db_id = ?", (db_id,))