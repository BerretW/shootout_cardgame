import sys
import os
import sqlite3
from dataclasses import dataclass
from typing import List, Optional

# Pokusíme se importovat dotenv pro načtení klíče ze souboru .env
try:
    from dotenv import load_dotenv
    HAS_DOTENV = True
except ImportError:
    HAS_DOTENV = False

from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QSplitter, QListWidget, QPushButton, QLabel, QLineEdit, QTextEdit,
    QSpinBox, QComboBox, QFormLayout, QMessageBox, QInputDialog,
    QFileDialog, QDialog, QDialogButtonBox, QStackedWidget, QCheckBox, 
    QGroupBox
)
from PyQt6.QtGui import (
    QPixmap, QPainter, QColor, QFont, QPen, QImage, QPainterPath
)
from PyQt6.QtCore import Qt, QThread, pyqtSignal, QRect, QRectF

from google import genai
from google.genai import types

# --- KONFIGURACE CEST PRO EXE ---
def get_app_path():
    """
    Vrátí cestu ke složce, kde běží aplikace.
    Funguje správně jak pro Python skript, tak pro zkompilovaný .exe soubor.
    """
    if getattr(sys, 'frozen', False):
        # Pokud běžíme jako .exe (PyInstaller/auto-py-to-exe)
        return os.path.dirname(sys.executable)
    else:
        # Pokud běžíme jako skript
        return os.path.dirname(os.path.abspath(__file__))

# Načtení .env souboru (pokud existuje vedle .exe)
APP_PATH = get_app_path()
if HAS_DOTENV:
    load_dotenv(os.path.join(APP_PATH, ".env"))

# --- KONFIGURACE AI ---
VINTAGE_PROMPT_PREFIX = "A detailed 19th-century chromolithograph illustration of "
VINTAGE_PROMPT_SUFFIX = ", vintage cigarette card style, highly detailed, muted antique colors, isolated subject, NO TEXT, NO BORDERS, NO WRITING, plain aged paper background, masterpiece quality, authentic 1890s aesthetic."

# --- DATOVÉ STRUKTURY ---
@dataclass
class CardData:
    db_id: Optional[int]
    deck_id: int
    card_number: str
    faction: str
    title: str
    type: str
    cost: int
    defense: int
    health: int
    description: str
    image_prompt: str
    image_data: Optional[bytes] = None

# --- DATABÁZE ---
class DatabaseManager:
    def __init__(self, db_name="cards.db"):
        # DŮLEŽITÉ: Cesta k DB musí být absolutní vůči umístění .exe
        self.db_path = os.path.join(get_app_path(), db_name)
        self.conn = sqlite3.connect(self.db_path)
        self.init_db()

    def init_db(self):
        with self.conn:
            self.conn.execute("""
                CREATE TABLE IF NOT EXISTS decks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT UNIQUE NOT NULL
                )
            """)
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
                    FOREIGN KEY(deck_id) REFERENCES decks(id) ON DELETE CASCADE
                )
            """)

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
        cursor.execute("SELECT * FROM cards WHERE deck_id = ? ORDER BY db_id", (deck_id,))
        cards = []
        for row in cursor.fetchall():
            cards.append(CardData(
                db_id=row[0], deck_id=row[1], card_number=row[2], faction=row[3],
                title=row[4], type=row[5], cost=row[6], defense=row[7],
                health=row[8], description=row[9], image_prompt=row[10], image_data=row[11]
            ))
        return cards

    def save_card(self, card: CardData) -> int:
        cursor = self.conn.cursor()
        if card.db_id is None:
            cursor.execute("""
                INSERT INTO cards (deck_id, card_number, faction, title, type, cost, defense, health, description, image_prompt, image_data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (card.deck_id, card.card_number, card.faction, card.title, card.type, card.cost, card.defense, card.health, card.description, card.image_prompt, card.image_data))
            card.db_id = cursor.lastrowid
        else:
            cursor.execute("""
                UPDATE cards SET card_number=?, faction=?, title=?, type=?, cost=?, defense=?, health=?, description=?, image_prompt=?, image_data=?
                WHERE db_id=?
            """, (card.card_number, card.faction, card.title, card.type, card.cost, card.defense, card.health, card.description, card.image_prompt, card.image_data, card.db_id))
        self.conn.commit()
        return card.db_id

    def delete_card(self, db_id: int):
        with self.conn:
            self.conn.execute("DELETE FROM cards WHERE db_id = ?", (db_id,))

# --- AI GENERÁTOR ---
class ImageGeneratorThread(QThread):
    finished = pyqtSignal(int, bytes)
    error = pyqtSignal(str)

    def __init__(self, db_id: int, prompt: str):
        super().__init__()
        self.db_id = db_id
        self.prompt = prompt

    def run(self):
        # Nyní hledáme klíč buď v systému, nebo načtený z .env
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            self.error.emit("Není nastaven GEMINI_API_KEY.\nVytvořte soubor .env vedle aplikace s obsahem:\nGEMINI_API_KEY=vas_klic")
            return
            
        try:
            client = genai.Client(api_key=api_key, http_options={'api_version': 'v1alpha'})
            full_prompt = f"{VINTAGE_PROMPT_PREFIX}{self.prompt}{VINTAGE_PROMPT_SUFFIX}"
            
            response = client.models.generate_content(
                model="gemini-3.1-flash-image-preview",
                contents=[full_prompt],
            )
            
            image_bytes = None
            for part in response.parts:
                if part.inline_data is not None:
                    image_bytes = part.inline_data.data
                    break
                    
            if image_bytes:
                self.finished.emit(self.db_id, image_bytes)
            else:
                self.error.emit("AI odpověděla, ale nevrátila data obrázku.")
                
        except Exception as e:
            self.error.emit(f"Chyba při generování: {str(e)}")

# --- DIALOG KONSTRUKTORU EFEKTŮ ---
class EffectConstructorDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("⚙️ Konstruktor herních mechanismů")
        self.resize(600, 550)
        self.setStyleSheet("""
            QDialog { background-color: #1a1614; color: #dcd7c9; }
            QGroupBox { border: 1px solid #3a2f26; margin-top: 10px; font-weight: bold; color: #8b4513; }
            QGroupBox::title { subcontrol-origin: margin; left: 10px; padding: 0 3px 0 3px; }
            QLabel, QCheckBox, QRadioButton { color: #dcd7c9; }
            QComboBox, QSpinBox, QLineEdit { background-color: #0f0d0c; color: white; border: 1px solid #3a2f26; padding: 4px; }
            QPushButton { background-color: #2c241e; color: white; border: 1px solid #3a2f26; padding: 8px; }
            QPushButton:hover { background-color: #3a2f26; }
        """)

        layout = QVBoxLayout(self)

        # 1. Keywords
        kw_group = QGroupBox("1. Klíčová slova (Keywords)")
        kw_layout = QHBoxLayout(kw_group)
        self.cb_guardian = QCheckBox("Guardian")
        self.cb_ambush = QCheckBox("Ambush")
        self.cb_stealth = QCheckBox("Stealth")
        self.cb_lethal = QCheckBox("Lethal")
        for cb in [self.cb_guardian, self.cb_ambush, self.cb_stealth, self.cb_lethal]:
            kw_layout.addWidget(cb)
            cb.stateChanged.connect(self.update_preview)
        layout.addWidget(kw_group)

        # 2. Trigger
        trig_group = QGroupBox("2. Spouštěč (Trigger)")
        trig_layout = QVBoxLayout(trig_group)
        self.combo_trigger = QComboBox()
        self.combo_trigger.addItems([
            "--- Žádný (Pasivní / Gear / Kouzlo) ---", "Battlecry:", "Last word:", "End of turn:", "Start of your turn:"
        ])
        self.combo_trigger.currentIndexChanged.connect(self.update_preview)
        trig_layout.addWidget(self.combo_trigger)
        layout.addWidget(trig_group)

        # 3. Action
        act_group = QGroupBox("3. Efekt (Action)")
        act_layout = QVBoxLayout(act_group)
        
        self.combo_action = QComboBox()
        self.combo_action.addItem("Žádná akce", "none")
        self.combo_action.addItem("Zranit (Deal damage)", "dmg")
        self.combo_action.addItem("Léčit (Restore/Heal)", "heal")
        self.combo_action.addItem("Líznout karty (Draw)", "draw")
        self.combo_action.addItem("Získat Grit (Gain Grit)", "grit")
        self.combo_action.addItem("Zahodit karty (Discard)", "discard")
        self.combo_action.addItem("Zničit všechny (Destroy All)", "wipe")
        self.combo_action.addItem("Buff statů (pro Gear)", "buff")
        
        act_layout.addWidget(QLabel("Typ efektu:"))
        act_layout.addWidget(self.combo_action)

        self.stacked = QStackedWidget()
        act_layout.addWidget(self.stacked)

        self.page_none = QWidget(); self.stacked.addWidget(self.page_none)

        self.page_dmg = QWidget()
        l_dmg = QHBoxLayout(self.page_dmg)
        self.spin_dmg = QSpinBox(); self.spin_dmg.setRange(1, 99)
        self.combo_dmg_target = QComboBox()
        self.combo_dmg_target.addItem("(bez cíle)", "")
        self.combo_dmg_target.addItem("do všech (to all characters)", "to all characters")
        self.combo_dmg_target.addItem("do všech nepřátel (to all enemy units)", "to all enemy units")
        self.combo_dmg_target.addItem("do tvého hrdiny (to your hero)", "to your hero")
        self.combo_dmg_target.addItem("náhodný nepřítel (random enemy)", "random enemy")
        l_dmg.addWidget(QLabel("Počet:")); l_dmg.addWidget(self.spin_dmg)
        l_dmg.addWidget(QLabel("Cíl:")); l_dmg.addWidget(self.combo_dmg_target)
        self.stacked.addWidget(self.page_dmg)

        self.page_heal = QWidget()
        l_heal = QHBoxLayout(self.page_heal)
        self.spin_heal = QSpinBox(); self.spin_heal.setRange(1, 99)
        self.combo_heal_type = QComboBox()
        self.combo_heal_type.addItem("běžné léčení", "restore")
        self.combo_heal_type.addItem("plné vyléčení", "fully")
        self.combo_heal_target = QComboBox()
        self.combo_heal_target.addItem("(target)", "")
        self.combo_heal_target.addItem("to your hero", "to your hero")
        l_heal.addWidget(self.combo_heal_type); l_heal.addWidget(self.spin_heal); l_heal.addWidget(self.combo_heal_target)
        self.stacked.addWidget(self.page_heal)

        self.page_num = QWidget()
        l_num = QHBoxLayout(self.page_num)
        self.spin_num = QSpinBox(); self.spin_num.setRange(1, 10)
        l_num.addWidget(QLabel("Množství:")); l_num.addWidget(self.spin_num); l_num.addStretch()
        self.stacked.addWidget(self.page_num)

        self.page_disc = QWidget()
        l_disc = QHBoxLayout(self.page_disc)
        self.combo_disc = QComboBox(); self.combo_disc.addItem("Zahodit ruku", "hand"); self.combo_disc.addItem("Zahodit X karet", "num")
        self.spin_disc = QSpinBox(); self.spin_disc.setRange(1, 10)
        l_disc.addWidget(self.combo_disc); l_disc.addWidget(self.spin_disc)
        self.stacked.addWidget(self.page_disc)

        self.page_wipe = QWidget()
        l_wipe = QVBoxLayout(self.page_wipe); l_wipe.addWidget(QLabel("Efekt: Destroy ALL Units"))
        self.stacked.addWidget(self.page_wipe)

        self.page_buff = QWidget()
        l_buff = QHBoxLayout(self.page_buff)
        self.spin_buff_atk = QSpinBox(); self.spin_buff_atk.setRange(-10, 10)
        self.spin_buff_hp = QSpinBox(); self.spin_buff_hp.setRange(0, 10)
        l_buff.addWidget(QLabel("+ Atk:")); l_buff.addWidget(self.spin_buff_atk)
        l_buff.addWidget(QLabel("+ HP:")); l_buff.addWidget(self.spin_buff_hp)
        self.stacked.addWidget(self.page_buff)

        layout.addWidget(act_group)

        # 4. Preview
        prev_group = QGroupBox("Výsledný text pro parser")
        prev_lay = QVBoxLayout(prev_group)
        self.res_line = QLineEdit()
        self.res_line.setReadOnly(True)
        self.res_line.setStyleSheet("font-family: Consolas; font-size: 14px; color: #55ff55; background: #000;")
        prev_lay.addWidget(self.res_line)
        layout.addWidget(prev_group)

        # Buttons
        btns = QDialogButtonBox(QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel)
        btns.accepted.connect(self.accept)
        btns.rejected.connect(self.reject)
        btns.button(QDialogButtonBox.StandardButton.Ok).setText("Vložit do karty")
        layout.addWidget(btns)

        # Signals
        self.combo_action.currentIndexChanged.connect(self.on_action_change)
        
        widgets = [self.spin_dmg, self.combo_dmg_target, self.spin_heal, self.combo_heal_type,
                   self.combo_heal_target, self.spin_num, self.combo_disc, self.spin_disc,
                   self.spin_buff_atk, self.spin_buff_hp]
        for w in widgets:
            if isinstance(w, QSpinBox): w.valueChanged.connect(self.update_preview)
            if isinstance(w, QComboBox): w.currentIndexChanged.connect(self.update_preview)

        self.on_action_change()

    def on_action_change(self):
        data = self.combo_action.currentData()
        if data == "none": self.stacked.setCurrentWidget(self.page_none)
        elif data == "dmg": self.stacked.setCurrentWidget(self.page_dmg)
        elif data == "heal": self.stacked.setCurrentWidget(self.page_heal)
        elif data in ["draw", "grit"]: self.stacked.setCurrentWidget(self.page_num)
        elif data == "discard": self.stacked.setCurrentWidget(self.page_disc)
        elif data == "wipe": self.stacked.setCurrentWidget(self.page_wipe)
        elif data == "buff": self.stacked.setCurrentWidget(self.page_buff)
        self.update_preview()

    def update_preview(self):
        parts = []
        kws = []
        if self.cb_guardian.isChecked(): kws.append("Guardian")
        if self.cb_ambush.isChecked(): kws.append("Ambush")
        if self.cb_stealth.isChecked(): kws.append("Stealth")
        if self.cb_lethal.isChecked(): kws.append("Lethal")
        if kws: parts.append(", ".join(kws) + ".")

        if self.combo_trigger.currentIndex() > 0:
            parts.append(self.combo_trigger.currentText())

        act = self.combo_action.currentData()
        atxt = ""
        if act == "dmg":
            tgt = self.combo_dmg_target.currentData()
            atxt = f"deal {self.spin_dmg.value()} damage" + (f" {tgt}" if tgt else "")
        elif act == "heal":
            htype = self.combo_heal_type.currentData()
            tgt = self.combo_heal_target.currentData()
            atxt = "fully heal" if htype == "fully" else f"restore {self.spin_heal.value()} health"
            if tgt: atxt += f" {tgt}"
        elif act == "draw": atxt = f"draw {self.spin_num.value()}"
        elif act == "grit": atxt = f"gain {self.spin_num.value()} grit"
        elif act == "discard": atxt = "discard your hand" if self.combo_disc.currentData() == "hand" else f"discard {self.spin_disc.value()} cards"
        elif act == "wipe": atxt = "destroy all units"
        elif act == "buff":
            atk, hp = self.spin_buff_atk.value(), self.spin_buff_hp.value()
            atxt = f"+{atk}/+{hp}" if atk >= 0 else f"{atk}/+{hp}"

        if atxt: parts.append(atxt)
        
        final = " ".join(parts)
        if final: final = final[0].upper() + final[1:]
        self.res_line.setText(final)

    def get_result(self):
        return self.res_line.text()

# --- HLAVNÍ WIDGET KARTY (RENDERER) ---
class CardPreviewWidget(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedSize(380, 620)
        self.card: Optional[CardData] = None
        self.pixmap: Optional[QPixmap] = None

    def set_card(self, card: Optional[CardData]):
        self.card = card
        if card and card.image_data:
            img = QImage.fromData(card.image_data)
            self.pixmap = QPixmap.fromImage(img)
        else:
            self.pixmap = None
        self.update()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)

        if not self.card:
            painter.fillRect(self.rect(), QColor("#1a1614"))
            painter.setPen(QColor("#dcd7c9"))
            painter.drawText(self.rect(), Qt.AlignmentFlag.AlignCenter, "Žádná karta není vybrána")
            return

        # Podklad
        card_rect = self.rect()
        painter.fillRect(card_rect, QColor("#fdfbf7"))
        painter.setPen(QPen(QColor("#8b4513"), 2)); painter.drawRect(card_rect.adjusted(6, 6, -6, -6))

        # Obrázek
        img_rect = QRect(0, 0, self.width(), int(self.height() * 0.65))
        if self.pixmap:
            scaled = self.pixmap.scaled(img_rect.size(), Qt.AspectRatioMode.KeepAspectRatioByExpanding, Qt.TransformationMode.SmoothTransformation)
            clip = QPainterPath(); clip.addRect(QRectF(img_rect)); painter.setClipPath(clip)
            painter.drawPixmap(img_rect.topLeft(), scaled, QRect((scaled.width()-img_rect.width())//2, (scaled.height()-img_rect.height())//2, img_rect.width(), img_rect.height()))
            painter.setClipping(False)
        else:
            painter.fillRect(img_rect, QColor("#f4f1ea"))
            painter.setPen(QColor("#4a3f35"))
            painter.drawText(img_rect, Qt.AlignmentFlag.AlignCenter, "[Chromolithograph Placeholder]")

        # ID & Cost
        painter.setPen(QColor("#2c241e")); painter.setFont(QFont("Georgia", 20, QFont.Weight.Black))
        painter.drawText(QRect(20, 20, 50, 40), Qt.AlignmentFlag.AlignLeft, str(self.card.card_number))
        
        cost_circle = QRect(self.width() - 60, 20, 40, 40)
        painter.setBrush(QColor(253, 251, 247, 200)); painter.setPen(QPen(QColor("#8b4513"), 2)); painter.drawEllipse(cost_circle)
        painter.setPen(QColor("#8b4513")); painter.setFont(QFont("Georgia", 18, QFont.Weight.Bold))
        painter.drawText(cost_circle, Qt.AlignmentFlag.AlignCenter, str(self.card.cost))

        # Info Box
        info_rect = QRect(0, int(self.height() * 0.65), self.width(), int(self.height() * 0.35))
        painter.fillRect(info_rect, QColor("#f5e6d3"))
        painter.setPen(QPen(QColor(139, 69, 19, 50), 2)); painter.drawLine(info_rect.topLeft(), info_rect.topRight())

        # Texts
        painter.setPen(QColor(139, 69, 19, 150)); painter.setFont(QFont("Arial", 8, QFont.Weight.Black))
        painter.drawText(QRect(info_rect.x(), info_rect.y() + 15, info_rect.width(), 20), Qt.AlignmentFlag.AlignCenter, f"{self.card.faction.upper()} COLLECTION")

        painter.setPen(QColor("#1a1614")); painter.setFont(QFont("Georgia", 22, QFont.Weight.Black))
        painter.drawText(QRect(info_rect.x() + 20, info_rect.y() + 35, info_rect.width() - 40, 40), Qt.AlignmentFlag.AlignCenter, self.card.title.upper())

        # Description
        desc_rect = QRect(info_rect.x() + 30, info_rect.y() + 95, info_rect.width() - 60, 60)
        painter.setPen(QColor("#4a3f35")); painter.setFont(QFont("Georgia", 11, italic=True))
        painter.drawText(desc_rect, int(Qt.AlignmentFlag.AlignCenter) | int(Qt.TextFlag.TextWordWrap), f'"{self.card.description}"')

        # --- STATS ROW (Custom icons) ---
        stats_rect = QRect(info_rect.x() + 20, info_rect.bottom() - 50, info_rect.width() - 40, 40)
        painter.setPen(QPen(QColor(139, 69, 19, 80), 2)); painter.drawLine(stats_rect.topLeft(), stats_rect.topRight())

        num_font = QFont("Georgia", 18, QFont.Weight.Black)
        icon_font = QFont("Georgia", 24)

        # Attack/Defense (Left) - Sheriff Star
        painter.setFont(icon_font); painter.setPen(QColor("#8b4513"))
        painter.drawText(QRect(stats_rect.x(), stats_rect.y(), 35, stats_rect.height()), int(Qt.AlignmentFlag.AlignLeft) | int(Qt.AlignmentFlag.AlignVCenter), "✯")
        painter.setFont(num_font); painter.setPen(QColor("#2c241e"))
        painter.drawText(QRect(stats_rect.x() + 35, stats_rect.y(), 40, stats_rect.height()), int(Qt.AlignmentFlag.AlignLeft) | int(Qt.AlignmentFlag.AlignVCenter), str(self.card.defense))

        # Health (Right) - Red Heart
        painter.setFont(num_font); painter.setPen(QColor("#2c241e"))
        painter.drawText(QRect(stats_rect.right() - 75, stats_rect.y(), 40, stats_rect.height()), int(Qt.AlignmentFlag.AlignRight) | int(Qt.AlignmentFlag.AlignVCenter), str(self.card.health))
        painter.setFont(icon_font); painter.setPen(QColor("#8a1c1c"))
        painter.drawText(QRect(stats_rect.right() - 30, stats_rect.y(), 30, stats_rect.height()), int(Qt.AlignmentFlag.AlignRight) | int(Qt.AlignmentFlag.AlignVCenter), "♥")

        # Type (Center)
        painter.setPen(QColor(139, 69, 19, 180)); painter.setFont(QFont("Courier", 11, QFont.Weight.Bold))
        painter.drawText(stats_rect, int(Qt.AlignmentFlag.AlignCenter) | int(Qt.AlignmentFlag.AlignVCenter), self.card.type.upper())

# --- HLAVNÍ OKNO ---
class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("RDR2 Card Editor & Generator")
        self.resize(1100, 800)
        self.db = DatabaseManager()
        self.current_deck_id = None
        self.cards = []
        self.active_card_index = -1
        self._updating_form = False
        
        self.setup_ui()
        self.load_decks()

    def setup_ui(self):
        main_widget = QWidget(); self.setCentralWidget(main_widget)
        main_layout = QHBoxLayout(main_widget); main_layout.setContentsMargins(0, 0, 0, 0)
        splitter = QSplitter(Qt.Orientation.Horizontal); main_layout.addWidget(splitter)

        # Levý panel
        left_panel = QWidget(); left_panel.setStyleSheet("background-color: #1a1614; color: #dcd7c9;")
        left_layout = QVBoxLayout(left_panel)
        
        # Decky
        d_layout = QHBoxLayout()
        self.deck_combo = QComboBox(); self.deck_combo.currentIndexChanged.connect(self.on_deck_changed)
        btn_new = QPushButton("Nový balíček"); btn_new.clicked.connect(self.new_deck)
        btn_new.setStyleSheet("background-color: #8b4513; color: white;")
        d_layout.addWidget(self.deck_combo); d_layout.addWidget(btn_new)
        left_layout.addLayout(d_layout)

        # Seznam
        self.list_widget = QListWidget(); self.list_widget.currentRowChanged.connect(self.on_card_selected)
        self.list_widget.setStyleSheet("background-color: #0f0d0c; border: 1px solid #3a2f26;")
        left_layout.addWidget(self.list_widget)

        btns_l = QHBoxLayout()
        b_add = QPushButton("Přidat kartu"); b_add.clicked.connect(self.add_card)
        b_del = QPushButton("Smazat"); b_del.clicked.connect(self.delete_card)
        btns_l.addWidget(b_add); btns_l.addWidget(b_del)
        left_layout.addLayout(btns_l)

        # Formulář
        self.form_widget = QWidget(); form_layout = QFormLayout(self.form_widget)
        self.inp_id = QLineEdit()
        self.inp_faction = QComboBox(); self.inp_faction.addItems(["Law", "Neutral", "Wild", "Outlaw"])
        self.inp_title = QLineEdit()
        self.inp_cost = QSpinBox(); self.inp_cost.setRange(0, 99)
        self.inp_def = QSpinBox(); self.inp_def.setRange(0, 99)
        self.inp_hp = QSpinBox(); self.inp_hp.setRange(0, 99)
        self.inp_type = QLineEdit()
        self.inp_desc = QTextEdit(); self.inp_desc.setMaximumHeight(60)
        self.inp_prompt = QLineEdit()

        form_layout.addRow("ID:", self.inp_id)
        form_layout.addRow("Kolekce:", self.inp_faction)
        form_layout.addRow("Název:", self.inp_title)
        s_layout = QHBoxLayout()
        s_layout.addWidget(QLabel("Cost:")); s_layout.addWidget(self.inp_cost)
        s_layout.addWidget(QLabel("Grit:")); s_layout.addWidget(self.inp_def)
        s_layout.addWidget(QLabel("HP:")); s_layout.addWidget(self.inp_hp)
        form_layout.addRow(s_layout)
        form_layout.addRow("Typ:", self.inp_type)

        # Popis + Konstruktor
        desc_label_widget = QWidget()
        desc_l = QHBoxLayout(desc_label_widget)
        desc_l.setContentsMargins(0, 0, 0, 0) # Aby to lícovalo
        
        desc_l.addWidget(QLabel("Popis:"))
        btn_cons = QPushButton("🛠️ Konstruktor")
        btn_cons.setStyleSheet("background-color: #2c241e; border: 1px solid #8b4513; padding: 2px;")
        btn_cons.clicked.connect(self.open_effect_constructor)
        desc_l.addWidget(btn_cons)
        desc_l.addStretch()
        
        form_layout.addRow(desc_label_widget, self.inp_desc)

        form_layout.addRow("Prompt:", self.inp_prompt)
        left_layout.addWidget(self.form_widget)

        # Generování & Export
        self.btn_gen = QPushButton("✨ Vygenerovat Ilustraci (AI)")
        self.btn_gen.clicked.connect(self.generate_image)
        self.btn_gen.setStyleSheet("background-color: #8b4513; color: white; padding: 12px; font-weight: bold;")
        left_layout.addWidget(self.btn_gen)

        btn_exp = QPushButton("💾 Export do PNG")
        btn_exp.clicked.connect(self.export_card)
        left_layout.addWidget(btn_exp)

        # Pravý panel
        right_panel = QWidget(); right_panel.setStyleSheet("background-color: #0f0d0c;")
        r_layout = QVBoxLayout(right_panel); r_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.preview = CardPreviewWidget(); r_layout.addWidget(self.preview)
        
        splitter.addWidget(left_panel); splitter.addWidget(right_panel)
        splitter.setSizes([400, 700])

        # Events
        for w in [self.inp_id, self.inp_title, self.inp_type, self.inp_prompt]: w.textChanged.connect(self.save_current_card)
        self.inp_desc.textChanged.connect(self.save_current_card)
        self.inp_faction.currentTextChanged.connect(self.save_current_card)
        for w in [self.inp_cost, self.inp_def, self.inp_hp]: w.valueChanged.connect(self.save_current_card)

    def load_decks(self):
        self.deck_combo.blockSignals(True)
        self.deck_combo.clear()
        decks = self.db.get_decks()
        for d_id, d_name in decks: self.deck_combo.addItem(d_name, d_id)
        self.deck_combo.blockSignals(False)
        if decks: self.deck_combo.setCurrentIndex(0); self.on_deck_changed()

    def new_deck(self):
        n, ok = QInputDialog.getText(self, "Nový balíček", "Název:")
        if ok and n:
            nid = self.db.create_deck(n)
            self.load_decks()
            self.deck_combo.setCurrentIndex(self.deck_combo.findData(nid))

    def on_deck_changed(self):
        self.current_deck_id = self.deck_combo.currentData()
        self.load_cards()

    def load_cards(self):
        if not self.current_deck_id: return
        self.cards = self.db.get_cards(self.current_deck_id)
        self.list_widget.blockSignals(True); self.list_widget.clear()
        for c in self.cards: self.list_widget.addItem(f"{c.card_number} - {c.title}")
        self.list_widget.blockSignals(False)
        if self.cards: self.list_widget.setCurrentRow(0)
        else: self.active_card_index = -1; self.update_form()

    def add_card(self):
        if not self.current_deck_id: return
        c = CardData(None, self.current_deck_id, str(len(self.cards)+1), "Neutral", "NOVÁ KARTA", "Unit", 1, 1, 1, "", "western scene")
        self.db.save_card(c)
        self.load_cards()
        self.list_widget.setCurrentRow(len(self.cards)-1)

    def delete_card(self):
        if 0 <= self.active_card_index < len(self.cards):
            c = self.cards[self.active_card_index]
            if c.db_id: self.db.delete_card(c.db_id)
            self.load_cards()

    def on_card_selected(self, idx):
        self.active_card_index = idx
        self.update_form()

    def update_form(self):
        self._updating_form = True
        if 0 <= self.active_card_index < len(self.cards):
            c = self.cards[self.active_card_index]
            self.inp_id.setText(c.card_number)
            self.inp_faction.setCurrentText(c.faction)
            self.inp_title.setText(c.title)
            self.inp_type.setText(c.type)
            self.inp_cost.setValue(c.cost)
            self.inp_def.setValue(c.defense)
            self.inp_hp.setValue(c.health)
            self.inp_desc.setPlainText(c.description)
            self.inp_prompt.setText(c.image_prompt)
            self.form_widget.setEnabled(True)
            self.preview.set_card(c)
        else:
            self.form_widget.setEnabled(False)
            self.preview.set_card(None)
        self._updating_form = False

    def save_current_card(self):
        if self._updating_form or self.active_card_index < 0: return
        c = self.cards[self.active_card_index]
        c.card_number = self.inp_id.text()
        c.faction = self.inp_faction.currentText()
        c.title = self.inp_title.text()
        c.type = self.inp_type.text()
        c.cost = self.inp_cost.value()
        c.defense = self.inp_def.value()
        c.health = self.inp_hp.value()
        c.description = self.inp_desc.toPlainText()
        c.image_prompt = self.inp_prompt.text()
        self.db.save_card(c)
        self.preview.update()
        it = self.list_widget.item(self.active_card_index)
        if it: it.setText(f"{c.card_number} - {c.title}")

    def generate_image(self):
        if self.active_card_index < 0: return
        c = self.cards[self.active_card_index]
        self.btn_gen.setEnabled(False); self.btn_gen.setText("⏳ Generuji...")
        self.worker = ImageGeneratorThread(c.db_id, c.image_prompt)
        self.worker.finished.connect(self.on_img_done)
        self.worker.error.connect(lambda e: (QMessageBox.warning(self, "Chyba", e), self.btn_gen.setEnabled(True), self.btn_gen.setText("✨ Vygenerovat Ilustraci (AI)")))
        self.worker.start()

    def on_img_done(self, db_id, data):
        self.btn_gen.setEnabled(True); self.btn_gen.setText("✨ Vygenerovat Ilustraci (AI)")
        for c in self.cards:
            if c.db_id == db_id:
                c.image_data = data
                self.db.save_card(c)
                if self.cards[self.active_card_index].db_id == db_id: self.preview.set_card(c)
                break

    def export_card(self):
        if self.active_card_index < 0: return
        c = self.cards[self.active_card_index]
        path, _ = QFileDialog.getSaveFileName(self, "Uložit", f"{c.card_number}_{c.title}.png", "PNG (*.png)")
        if path: self.preview.grab().save(path)

    def open_effect_constructor(self):
        d = EffectConstructorDialog(self)
        if d.exec():
            res = d.get_result()
            if res:
                self.inp_desc.setPlainText(res)
                self.save_current_card()

if __name__ == "__main__":
    app = QApplication(sys.argv)
    if hasattr(Qt.ApplicationAttribute, "AA_EnableHighDpiScaling"):
        app.setAttribute(Qt.ApplicationAttribute.AA_EnableHighDpiScaling, True)
    w = MainWindow()
    w.show()
    sys.exit(app.exec())