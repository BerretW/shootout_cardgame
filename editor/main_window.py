import sys
import os
import re
from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, QSplitter, QListWidget, 
    QPushButton, QLabel, QLineEdit, QTextEdit, QSpinBox, QComboBox, 
    QFormLayout, QMessageBox, QInputDialog, QFileDialog, QListWidgetItem,
    QCheckBox, QProgressBar, QApplication
)
from PyQt6.QtCore import Qt, QRect # Přidáno QRect, pokud chybí

# --- ZDE JE OPRAVA ---
# Ujistěte se, že tento řádek obsahuje QImage, QPainter, QColor, QPen
from PyQt6.QtGui import (
    QPixmap, QPainter, QColor, QFont, QPen, QImage, QPainterPath, QCursor
)
# ---------------------

from database import DatabaseManager
from models import CardData
from ai_worker import ImageGeneratorThread
from ui_widgets import CardPreviewWidget
from ui_dialogs import EffectConstructorDialog, LuaImportDialog

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("RDR2 Card Editor & Generator v1.1")
        self.resize(1200, 850)
        self.db = DatabaseManager()
        self.current_deck_id = None
        self.cards = []         # Všechny karty v balíčku
        self.filtered_cards = [] # Karty aktuálně zobrazené v seznamu
        self.active_card: CardData = None
        self._updating_form = False
        
        self.setup_ui()
        self.load_decks()
        
    def save_current_card_silent(self):
        """Uloží kartu bez překreslování celého UI (použito při drag&drop obrázku)."""
        if not self.active_card: 
            return
        # Data už jsou v self.active_card změněna widgetem (referencí), stačí uložit do DB
        self.db.save_card(self.active_card)

    def create_icon_from_widget(self, source_pixmap: QPixmap, size=100) -> QImage:
        """
        Vytvoří ikonu zmenšením celého náhledu karty.
        Zachová poměr stran a vycentruje výsledek na průhledné pozadí 100x100.
        """
        # 1. Zmenšíme obrázek tak, aby se vešel do 100x100 (zachová poměr stran)
        scaled = source_pixmap.scaled(
            size, size, 
            Qt.AspectRatioMode.KeepAspectRatio, 
            Qt.TransformationMode.SmoothTransformation
        )

        # 2. Vytvoříme prázdné čtvercové plátno (průhledné)
        result = QImage(size, size, QImage.Format.Format_ARGB32)
        result.fill(Qt.GlobalColor.transparent) 

        # 3. Vykreslíme zmenšenou kartu doprostřed plátna
        painter = QPainter(result)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)
        
        # Výpočet pozice pro vycentrování
        x = (size - scaled.width()) // 2
        y = (size - scaled.height()) // 2
        
        painter.drawPixmap(x, y, scaled)
        painter.end()
        
        return result
    
    def create_icon(self, card: CardData, size=100) -> QImage:
        """Vytvoří čtvercovou ikonu z obrázku karty (Center Crop)."""
        if not card.image_data:
            return None
            
        source_img = QImage.fromData(card.image_data)
        
        # Vytvoříme prázdný čtverec (pozadí barvy papíru)
        result = QImage(size, size, QImage.Format.Format_ARGB32)
        result.fill(QColor("#fdfbf7")) 
        
        painter = QPainter(result)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)
        
        # Logika Center Crop: Zjistíme kratší stranu a vyřízneme čtverec ze středu
        min_side = min(source_img.width(), source_img.height())
        
        src_x = (source_img.width() - min_side) // 2
        src_y = (source_img.height() - min_side) // 2
        
        # Vykreslíme výřez do cílové velikosti 100x100
        painter.drawImage(
            QRect(0, 0, size, size),           # Cíl: Celá plocha ikony
            source_img,                        # Zdroj: Původní obrázek
            QRect(src_x, src_y, min_side, min_side) # Výřez: Středový čtverec
        )
        
        # Volitelné: Tenký rámeček kolem ikony
        painter.setPen(QPen(QColor("#8b4513"), 2))
        painter.drawRect(0, 0, size, size)
        
        painter.end()
        return result

    def reset_image_pos(self):
        if not self.active_card: 
            return
        self.active_card.img_x = 0
        self.active_card.img_y = 0
        self.active_card.img_scale = 1.0
        self.db.save_card(self.active_card)
        self.preview.update()

    def setup_ui(self):
        main_widget = QWidget()
        self.setCentralWidget(main_widget)
        main_layout = QHBoxLayout(main_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        splitter = QSplitter(Qt.Orientation.Horizontal)
        main_layout.addWidget(splitter)

        # --- LEVÝ PANEL (Ovládání + Seznam) ---
        left_panel = QWidget()
        left_panel.setStyleSheet("background-color: #1a1614; color: #dcd7c9;")
        left_layout = QVBoxLayout(left_panel)
        
        # 1. Výběr balíčku (Deck)
        d_layout = QHBoxLayout()
        self.deck_combo = QComboBox()
        self.deck_combo.currentIndexChanged.connect(self.on_deck_changed)
        
        btn_new_deck = QPushButton("➕")
        btn_new_deck.setToolTip("Nový balíček")
        btn_new_deck.setFixedWidth(30)
        btn_new_deck.clicked.connect(self.new_deck)
        btn_new_deck.setStyleSheet("background-color: #8b4513; color: white;")
        
        d_layout.addWidget(self.deck_combo, 1)
        d_layout.addWidget(btn_new_deck)
        left_layout.addLayout(d_layout)

        # 2. Tlačítko pro Import
        btn_import = QPushButton("📥 Importovat data z Lua")
        btn_import.setStyleSheet("background-color: #2c241e; color: #aaaaaa; border: 1px dashed #555; margin-bottom: 5px;")
        btn_import.clicked.connect(self.open_lua_import)
        left_layout.addWidget(btn_import)

        # 3. Vyhledávání a Řazení (NOVÉ)
        search_layout = QHBoxLayout()
        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("🔍 Hledat kartu...")
        self.search_input.textChanged.connect(self.filter_list)
        
        self.cb_sort_id = QCheckBox("ID")
        self.cb_sort_id.setToolTip("Seřadit podle ID (1, 2, 10...)")
        self.cb_sort_id.setChecked(True)
        self.cb_sort_id.stateChanged.connect(lambda: (self.sort_cards(), self.filter_list()))

        search_layout.addWidget(self.search_input)
        search_layout.addWidget(self.cb_sort_id)
        left_layout.addLayout(search_layout)

        # 4. Seznam karet
        self.list_widget = QListWidget()
        # Změna z currentRowChanged na currentItemChanged pro bezpečnější práci s objekty
        self.list_widget.currentItemChanged.connect(self.on_list_item_changed)
        self.list_widget.setStyleSheet("background-color: #0f0d0c; border: 1px solid #3a2f26;")
        left_layout.addWidget(self.list_widget)

        # 5. Tlačítka pod seznamem
        btns_l = QHBoxLayout()
        b_add = QPushButton("Přidat kartu")
        b_add.clicked.connect(self.add_card)
        b_del = QPushButton("Smazat")
        b_del.clicked.connect(self.delete_card)
        btns_l.addWidget(b_add)
        btns_l.addWidget(b_del)
        left_layout.addLayout(btns_l)

        # 6. Formulář pro editaci
        self.form_widget = QWidget()
        form_layout = QFormLayout(self.form_widget)
        
        self.inp_id = QLineEdit()
        self.inp_faction = QComboBox()
        self.inp_faction.addItems(["Law", "Neutral", "Wild", "Outlaw", "Mythos", "Saloon"])
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
        s_layout.addWidget(QLabel("Atk:")); s_layout.addWidget(self.inp_def)
        s_layout.addWidget(QLabel("HP:")); s_layout.addWidget(self.inp_hp)
        form_layout.addRow(s_layout)
        
        form_layout.addRow("Typ:", self.inp_type)

        desc_label_widget = QWidget()
        desc_l = QHBoxLayout(desc_label_widget)
        desc_l.setContentsMargins(0, 0, 0, 0)
        desc_l.addWidget(QLabel("Popis:"))
        btn_cons = QPushButton("🛠️")
        btn_cons.setToolTip("Konstruktor efektů")
        btn_cons.setFixedWidth(30)
        btn_cons.setStyleSheet("background-color: #2c241e; border: 1px solid #8b4513;")
        btn_cons.clicked.connect(self.open_effect_constructor)
        desc_l.addWidget(btn_cons)
        desc_l.addStretch()
        
        form_layout.addRow(desc_label_widget, self.inp_desc)
        form_layout.addRow("Prompt:", self.inp_prompt)
        
        left_layout.addWidget(self.form_widget)

        # 7. Akce (Generování, Export)
        self.btn_gen = QPushButton("✨ Vygenerovat Ilustraci (AI)")
        self.btn_gen.clicked.connect(self.generate_image)
        self.btn_gen.setStyleSheet("background-color: #8b4513; color: white; padding: 10px; font-weight: bold;")
        left_layout.addWidget(self.btn_gen)

        exp_layout = QHBoxLayout()
        btn_exp_one = QPushButton("💾 PNG (Karta)")
        btn_exp_one.clicked.connect(self.export_single_card)
        
        btn_exp_all = QPushButton("📦 Export Všeho")
        btn_exp_all.clicked.connect(self.export_all_cards)
        btn_exp_all.setStyleSheet("background-color: #2c241e; border: 1px solid #555;")
        
        exp_layout.addWidget(btn_exp_one)
        exp_layout.addWidget(btn_exp_all)
        left_layout.addLayout(exp_layout)

# --- PRAVÝ PANEL (Náhled) ---
        right_panel = QWidget()
        right_panel.setStyleSheet("background-color: #0f0d0c;")
        r_layout = QVBoxLayout(right_panel)
        r_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        
        self.preview = CardPreviewWidget()
        # PROPOJENÍ SIGNÁLU: Když pustíme myš nebo zazoomujeme, uloží se to do DB
        self.preview.imageChanged.connect(self.save_current_card_silent)
        
        r_layout.addWidget(self.preview)

        # Tlačítko pro reset pozice obrázku
        btn_reset_img = QPushButton("🔄 Resetovat pozici/zoom obrázku")
        btn_reset_img.setFixedWidth(200)
        btn_reset_img.setStyleSheet("background-color: #2c241e; color: #888; border: 1px solid #444; font-size: 10px;")
        btn_reset_img.clicked.connect(self.reset_image_pos)
        r_layout.addWidget(btn_reset_img, alignment=Qt.AlignmentFlag.AlignCenter)
        
        splitter.addWidget(left_panel)
        splitter.addWidget(right_panel)
        splitter.setSizes([450, 650])

        # Events binding
        for w in [self.inp_id, self.inp_title, self.inp_type, self.inp_prompt]: 
            w.textChanged.connect(self.save_current_card)
        self.inp_desc.textChanged.connect(self.save_current_card)
        self.inp_faction.currentTextChanged.connect(self.save_current_card)
        for w in [self.inp_cost, self.inp_def, self.inp_hp]: 
            w.valueChanged.connect(self.save_current_card)

    def load_decks(self):
        self.deck_combo.blockSignals(True)
        self.deck_combo.clear()
        decks = self.db.get_decks()
        for d_id, d_name in decks: 
            self.deck_combo.addItem(d_name, d_id)
        self.deck_combo.blockSignals(False)
        
        if decks: 
            self.deck_combo.setCurrentIndex(0)
            self.on_deck_changed()

    def new_deck(self):
        n, ok = QInputDialog.getText(self, "Nový balíček", "Název:")
        if ok and n:
            nid = self.db.create_deck(n)
            self.load_decks()
            self.deck_combo.setCurrentIndex(self.deck_combo.findData(nid))

    def on_deck_changed(self):
        self.current_deck_id = self.deck_combo.currentData()
        self.load_cards()

    # --- LOGIKA NAČÍTÁNÍ, ŘAZENÍ A FILTROVÁNÍ ---
    
    def load_cards(self):
        if not self.current_deck_id: 
            return
            
        # 1. Načíst z DB
        self.cards = self.db.get_cards(self.current_deck_id)
        
        # 2. Seřadit
        self.sort_cards()
        
        # 3. Zobrazit (aplikuje i filtr)
        self.filter_list()

    def sort_cards(self):
        """Seřadí self.cards podle nastavení."""
        if self.cb_sort_id.isChecked():
            # Pomocná funkce pro "Human Sort" (aby 10 bylo za 2, ne za 1)
            def natural_keys(card):
                text = card.card_number
                return [int(c) if c.isdigit() else c for c in re.split(r'(\d+)', text)]
            
            self.cards.sort(key=natural_keys)
        else:
            # Jinak seřadit podle názvu
            self.cards.sort(key=lambda x: x.title.lower())

    def filter_list(self):
        """Naplní QListWidget podle vyhledávacího pole."""
        search_text = self.search_input.text().lower().strip()
        
        self.list_widget.blockSignals(True)
        self.list_widget.clear()
        
        # Pokud nehledáme, zobrazíme vše (už seřazené)
        # Pokud hledáme, filtrujeme
        
        prev_selected_db_id = self.active_card.db_id if self.active_card else None
        item_to_select = None

        for card in self.cards:
            # Filtr: ID nebo Název obsahuje text
            if not search_text or search_text in card.title.lower() or search_text in str(card.card_number).lower():
                item = QListWidgetItem(f"{card.card_number} - {card.title}")
                # DŮLEŽITÉ: Uložíme si celou referenci na objekt karty do položky
                # (nebo ID, ale objekt je rychlejší)
                item.setData(Qt.ItemDataRole.UserRole, card.db_id)
                self.list_widget.addItem(item)
                
                if card.db_id == prev_selected_db_id:
                    item_to_select = item

        self.list_widget.blockSignals(False)
        
        if item_to_select:
            self.list_widget.setCurrentItem(item_to_select)
        elif self.list_widget.count() > 0:
            self.list_widget.setCurrentRow(0)
        else:
            self.on_list_item_changed(None)

    def on_list_item_changed(self, current: QListWidgetItem, previous=None):
        """Voláno při změně výběru v seznamu."""
        if current:
            db_id = current.data(Qt.ItemDataRole.UserRole)
            # Najdeme kartu v paměti podle ID
            self.active_card = next((c for c in self.cards if c.db_id == db_id), None)
        else:
            self.active_card = None
            
        self.update_form()

    def add_card(self):
        if not self.current_deck_id: return
        
        # Zjistit nejvyšší číslo pro nové ID
        next_id = 1
        if self.cards:
            try:
                # Pokusíme se najít max číslo
                nums = [int(c.card_number) for c in self.cards if c.card_number.isdigit()]
                if nums: next_id = max(nums) + 1
            except: pass

        c = CardData(None, self.current_deck_id, str(next_id), "Neutral", "NOVÁ KARTA", "Unit", 1, 1, 1, "", "western scene")
        self.db.save_card(c)
        self.load_cards() # Znovu načíst a seřadit
        
        # Najít a označit novou kartu
        if c.db_id:
            for i in range(self.list_widget.count()):
                item = self.list_widget.item(i)
                if item.data(Qt.ItemDataRole.UserRole) == c.db_id:
                    self.list_widget.setCurrentItem(item)
                    break

    def delete_card(self):
        if self.active_card:
            confirm = QMessageBox.question(
                self, "Smazat", f"Opravdu smazat kartu {self.active_card.title}?",
                QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
            )
            if confirm == QMessageBox.StandardButton.Yes:
                if self.active_card.db_id: 
                    self.db.delete_card(self.active_card.db_id)
                self.load_cards()

    def update_form(self):
        self._updating_form = True
        
        if self.active_card:
            c = self.active_card
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
            self.inp_id.clear(); self.inp_title.clear(); self.inp_desc.clear()
            self.form_widget.setEnabled(False)
            self.preview.set_card(None)
            
        self._updating_form = False

    def save_current_card(self):
        if self._updating_form or not self.active_card: 
            return
            
        c = self.active_card
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
        
        # Aktualizace textu v seznamu (jen u aktuální položky)
        current_item = self.list_widget.currentItem()
        if current_item:
            current_item.setText(f"{c.card_number} - {c.title}")

    # --- AI GENERATION ---
    def generate_image(self):
        if not self.active_card: return
        c = self.active_card
        self.btn_gen.setEnabled(False)
        self.btn_gen.setText("⏳ Generuji...")
        
        self.worker = ImageGeneratorThread(c.db_id, c.image_prompt)
        self.worker.finished.connect(self.on_img_done)
        self.worker.error.connect(self.on_img_error)
        self.worker.start()

    def on_img_done(self, db_id, data):
        self.btn_gen.setEnabled(True)
        self.btn_gen.setText("✨ Vygenerovat Ilustraci (AI)")
        
        # Najít kartu v paměti a aktualizovat
        for c in self.cards:
            if c.db_id == db_id:
                c.image_data = data
                self.db.save_card(c)
                # Pokud je to aktivní karta, překreslit náhled
                if self.active_card and self.active_card.db_id == db_id:
                    self.preview.set_card(c)
                break

    def on_img_error(self, err_msg):
        QMessageBox.warning(self, "Chyba AI", err_msg)
        self.btn_gen.setEnabled(True)
        self.btn_gen.setText("✨ Vygenerovat Ilustraci (AI)")

    # --- EXPORT ---
    def export_single_card(self):
        if not self.active_card: return
        c = self.active_card
        path, _ = QFileDialog.getSaveFileName(self, "Uložit", f"{c.card_number}_{c.title}.png", "PNG (*.png)")
        if path: self.preview.grab().save(path)

    def export_all_cards(self):
        """Exportuje celý balíček (karty i ikony) do zvolené složky."""
        if not self.cards:
            QMessageBox.warning(self, "Chyba", "Žádné karty k exportu.")
            return

        folder = QFileDialog.getExistingDirectory(self, "Vybrat složku pro export")
        if not folder:
            return
            
        icons_folder = os.path.join(folder, "icons")
        os.makedirs(icons_folder, exist_ok=True)

        progress = QProgressBar()
        progress.setRange(0, len(self.cards))
        progress.setWindowTitle("Exportuji...")
        
        prog_dialog = QWidget()
        prog_dialog.setWindowTitle("Export balíčku")
        prog_dialog.setFixedSize(350, 120)
        prog_layout = QVBoxLayout(prog_dialog)
        prog_lbl = QLabel("Generuji karty a ikony...")
        prog_layout.addWidget(prog_lbl)
        prog_layout.addWidget(progress)
        prog_dialog.show()

        try:
            for i, card in enumerate(self.cards):
                safe_title = "".join([c for c in card.title if c.isalnum() or c in (' ', '-', '_')]).strip()
                #id_Type_Title
                filename_base = f"{card.card_number}_{card.type}_{safe_title}".replace(" ", "_")
                
                # 1. Nastavit data do widgetu
                self.preview.set_card(card)
                self.preview.repaint() 
                QApplication.processEvents() 
                
                # 2. Udělat screenshot celého widgetu (Hotová karta)
                full_card_pixmap = self.preview.grab()
                
                # --- A) ULOŽIT VELKOU KARTU ---
                full_card_path = os.path.join(folder, f"{filename_base}.png")
                full_card_pixmap.save(full_card_path)
                
                # --- B) VYTVOŘIT A ULOŽIT IKONU (Zmenšenina celé karty) ---
                icon_img = self.create_icon_from_widget(full_card_pixmap, size=100)
                icon_path = os.path.join(icons_folder, f"{filename_base}.png")
                icon_img.save(icon_path)
                
                progress.setValue(i + 1)
                prog_lbl.setText(f"Zpracováno: {card.title}")
            
            QMessageBox.information(self, "Hotovo", f"Export dokončen!\n\nKarty: {folder}\nIkony: {icons_folder}")
            
        except Exception as e:
            QMessageBox.critical(self, "Chyba", f"Chyba při exportu: {str(e)}")
        finally:
            prog_dialog.close()
            if self.active_card:
                self.preview.set_card(self.active_card)

    # --- DIALOGS ---
    def open_effect_constructor(self):
        d = EffectConstructorDialog(self)
        if d.exec():
            res = d.get_result()
            if res:
                self.inp_desc.setPlainText(res)
                self.save_current_card()

    def open_lua_import(self):
        if not self.current_deck_id:
            QMessageBox.warning(self, "Chyba", "Nejdříve vytvořte nebo vyberte balíček (Deck).")
            return

        dlg = LuaImportDialog(self.current_deck_id, self.db, self)
        if dlg.exec():
            self.load_cards()