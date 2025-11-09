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

# Build ve deploy
cd arac-bakim-web-sitesi

echo -e "${BLUE}🔨 Build yapılıyor...${NC}"
npm run build

echo -e "${BLUE}🌐 Netlify'a deploy ediliyor...${NC}"
if netlify deploy --prod --dir=dist 2>&1 | tee /tmp/netlify_deploy.log; then
    echo -e "\n${GREEN}✅ Deploy tamamlandı!${NC}"
    echo -e "${GREEN}🌍 Site: https://otoil-arac-bakim.netlify.app${NC}"
else
    DEPLOY_ERROR=$(cat /tmp/netlify_deploy.log 2>/dev/null || echo "")
    echo -e "\n${YELLOW}⚠️  Netlify deploy başarısız oldu${NC}"
    
    if echo "$DEPLOY_ERROR" | grep -q "paused\|credit\|exceeded"; then
        echo -e "${YELLOW}💡 Proje askıya alınmış veya limit aşılmış${NC}"
        echo -e "${YELLOW}📋 Çözüm adımları:${NC}"
        echo -e "   1. Netlify Dashboard → Site settings → General"
        echo -e "   2. Build minutes kullanımını kontrol edin"
        echo -e "   3. Yeni ay bekleyin veya plan yükseltin"
        echo -e "   4. GitHub entegrasyonu kurulduysa otomatik deploy çalışacak"
    else
        echo -e "${YELLOW}💡 Çözüm önerileri:${NC}"
        echo -e "   1. Netlify hesabınıza credit ekleyin"
        echo -e "   2. GitHub entegrasyonu ile otomatik deploy kullanın"
        echo -e "   3. Netlify dashboard'dan manuel deploy yapın"
    fi
    
    echo -e "\n${GREEN}✓ Git push başarılı - GitHub'da güncel${NC}"
    echo -e "${BLUE}💡 GitHub entegrasyonu kuruluysa otomatik deploy başlayacak${NC}"
    exit 1
fi

