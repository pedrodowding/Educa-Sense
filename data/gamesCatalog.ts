export interface GameItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  path: string;
  available: boolean;
}

export const GAMES_CATALOG: GameItem[] = [
  {
    id: 'memory',
    name: 'Neon Memory',
    description: 'Encontre os pares iguais!',
    icon: 'grid_view',
    color: 'bg-purple-500',
    path: '/hora-do-jogo/memory',
    available: true
  },
  {
    id: 'coleta',
    name: 'Pega Certo!',
    description: 'Pegue os itens corretos.',
    icon: 'touch_app',
    color: 'bg-blue-500',
    path: '/hora-do-jogo/coleta',
    available: true
  },
  {
    id: 'robo',
    name: 'Caminho do Robô',
    description: 'Leve o robô ao destino.',
    icon: 'smart_toy',
    color: 'bg-orange-500',
    path: '/hora-do-jogo/robo',
    available: true
  },
  {
    id: 'cofre',
    name: 'Cofre Mágico',
    description: 'Descubra a senha secreta.',
    icon: 'lock',
    color: 'bg-green-500',
    path: '/hora-do-jogo/cofre',
    available: true
  }
];
