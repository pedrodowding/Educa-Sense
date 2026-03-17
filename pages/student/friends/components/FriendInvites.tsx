import React from 'react';
import { FriendRequest } from '../../../../types';

interface Props {
  requests: FriendRequest[];
  childId: string; // Para saber se sou sender ou receiver
  onAccept: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  loadingAction: string | null; // ID do request sendo processado
}

export const FriendInvites: React.FC<Props> = ({ 
  requests, 
  childId, 
  onAccept, 
  onReject, 
  onCancel,
  loadingAction 
}) => {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-white rounded-3xl shadow-sm border-2 border-dashed border-gray-200">
        <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">mail</span>
        <p className="text-sm text-text-sub font-bold">
          Sua caixa de correio está vazia! 📬
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((req) => {
        const isReceived = req.to_child_id === childId;
        const otherPerson = isReceived ? req.from_child : req.to_child;
        const isLoading = loadingAction === req.id;
        const requiresApproval = req.requires_parent_approval === true;

        return (
          <div 
            key={req.id} 
            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xl overflow-hidden">
                {otherPerson?.avatar || '👤'}
              </div>
              <div>
                <p className="font-bold text-text-main text-sm">
                  {otherPerson?.name || 'Alguém'}
                </p>
                <p className="text-xs text-text-sub">
                  {isReceived ? (requiresApproval ? 'Aguardando aprovação do responsável' : 'Quer ser seu amigo') : 'Aguardando resposta'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isLoading ? (
                <span className="animate-spin material-symbols-outlined text-gray-400">progress_activity</span>
              ) : isReceived ? (
                <>
                  <button 
                    onClick={() => onReject(req.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    title="Recusar"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                  {!requiresApproval && (
                    <button 
                      onClick={() => onAccept(req.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                      title="Aceitar"
                    >
                      <span className="material-symbols-outlined text-lg">check</span>
                    </button>
                  )}
                </>
              ) : (
                <button 
                  onClick={() => onCancel(req.id)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
