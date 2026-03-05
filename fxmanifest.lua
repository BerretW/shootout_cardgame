fx_version 'cerulean'
game 'rdr3'
lua54 'yes'

rdr3_warning 'I acknowledge that this is a prerelease build of RedM, and I am aware my resources *will* become incompatible once RedM ships.'

description 'Shootout Card Game'
version '1.0.0'

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/style.css',
    'html/script.js',
    'html/cards.js',
    'html/img/*.png'
}

client_script 'client.lua'
server_script 'server.lua'