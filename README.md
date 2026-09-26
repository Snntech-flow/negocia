# 🏠 Negocia Lar — Rede de Parcerias Imobiliárias (MLS)

Plataforma B2B para conexão, co-corretagem e compartilhamento seguro de carteira entre corretores de imóveis.

### 🎯 Os 4 Pilares do Negocia Lar:
1. **Blindagem contra "Atravessar" a Captação 🛡️:** Dados do proprietário e endereço exato ocultos. Apenas dados públicos e fotos limpas.
2. **Compartilhamento White-Label 📲:** Gerador de link e PDF com nome, foto, CRECI e WhatsApp do corretor parceiro para enviar ao cliente final.
3. **Termo de Co-corretagem (50/50) em 1 clique 🤝:** Formalização digital de parcerias com aceite eletrônico rápido.
4. **Radar de Compradores (Match Reverso) 🎯:** Cruzamento automático entre imóveis captados e compradores cadastrados com notificação instantânea.

---

### 🛠️ Estrutura de Infraestrutura Local:
- **PostgreSQL 16**: Porta `5433` (para não colidir com o snn-flow na `5432`)
- **Redis 7**: Porta `6379` (cache e filas)
- **App Fullstack**: Next.js 14/15 + Tailwind CSS + TypeScript
