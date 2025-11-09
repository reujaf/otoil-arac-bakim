#!/bin/bash

# Git push ve Netlify deploy script'i
# Kullanım: ./deploy.sh "commit mesajı"

# set -e kaldırıldı - Netlify deploy hatası durumunda script devam etsin

# Renkler
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Deploy başlatılıyor...${NC}\n"

# Commit mesajı kontrolü
if [ -z "$1" ]; then
    echo -e "${YELLOW}⚠️  Commit mesajı belirtilmedi, varsayılan mesaj kullanılıyor.${NC}"
    COMMIT_MSG="Güncelleme"
else
    COMMIT_MSG="$1"
fi

# Proje dizinine git
cd "$(dirname "$0")"

# Git durumunu kontrol et
echo -e "${BLUE}📋 Git durumu kontrol ediliyor...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${GREEN}✓ Değişiklikler bulundu${NC}"
    
    # Tüm değişiklikleri ekle
    echo -e "${BLUE}📦 Değişiklikler ekleniyor...${NC}"
    git add .
    
    # Commit yap
    echo -e "${BLUE}💾 Commit yapılıyor: ${COMMIT_MSG}${NC}"
    git commit -m "$COMMIT_MSG"
    
    # Push yap
    echo -e "${BLUE}📤 GitHub'a push yapılıyor...${NC}"
    git push
    
    echo -e "${GREEN}✓ Git push tamamlandı${NC}\n"
else
    echo -e "${YELLOW}⚠️  Commit edilecek değişiklik yok${NC}\n"
fi

echo -e "\n${GREEN}✅ Git push tamamlandı!${NC}"
echo -e "${BLUE}🚀 GitHub Actions otomatik olarak deploy edecek${NC}"
echo -e "${BLUE}🌍 Site: https://reujaf.github.io/otoil-arac-bakim/${NC}"
echo -e "${YELLOW}💡 Deploy durumunu kontrol etmek için:${NC}"
echo -e "   https://github.com/reujaf/otoil-arac-bakim/actions"

