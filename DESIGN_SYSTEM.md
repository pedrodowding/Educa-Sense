
# EducaSense - Design System & Assets

## 1. Ícones e Figurinhas (Album Assets)

Para garantir consistência visual e estabilidade, os ícones principais do Álbum de Figurinhas foram migrados de URLs externas para assets locais hospedados na aplicação.

### Padrão de Nomenclatura e Caminhos
Todos os assets do álbum devem ser armazenados em `public/assets/album/`.

| Personagem | Arquivo | Origem Original (Ref) | Status |
|---|---|---|---|
| **Raposinha Esperta** | `/assets/album/fox.png` | Flaticon (Fox Cute) | ✅ Local |
| **Dragão Dourado** | `/assets/album/dragon.png` | Flaticon (Dragon Epic) | ✅ Local |

### Regras de Implementação
1. **Nunca** use URLs diretas do Flaticon ou outros CDNs externos para itens críticos de gamificação, pois elas podem expirar ou mudar.
2. Ao adicionar novos itens ao `supabase_album.sql`, baixe o PNG para `public/assets/album/` e referencie o caminho relativo.
3. Classes CSS padrão para exibição de ícones de álbum:
   - Lista/Grid: `w-20 h-20 object-contain`
   - Modal de Recompensa: `w-32 h-32 object-contain`

## 2. Dashboard Admin

O painel administrativo (`/admin/dashboard`) segue o seguinte padrão visual:

- **Header**: Fundo preto (`bg-black`), texto branco. Cards de estatísticas com fundo translúcido (`bg-white/5`).
- **Cards de Métricas**:
  - Ícone: Material Symbols Outlined.
  - Valor: Fonte `Lexend`, Bold/Black, Tamanho 2xl.
  - Label: Uppercase, tracking-widest, tamanho 10px.
- **Gráficos**:
  - Barras de progresso simples usando CSS (`div` com width %).
  - Cores semânticas:
    - **Premium**: `bg-yellow-400`
    - **Free/Padrão**: `bg-primary` (#13eca4)

## 3. Cores Principais

- **Primary**: `#13eca4` (Verde EducaSense)
- **Background Light**: `#f6f8f7`
- **Background Dark**: `#10221c`
- **Surface Dark**: `#1a2c26`

---
*Documento atualizado em 28/01/2026 - Correção de Ícones e Novo Dashboard.*
