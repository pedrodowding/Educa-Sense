
import { supabase, setChildAccessCodeHeader } from './supabase';
import { getStudentSession } from './studentSession';

export interface Message {
  id: string;
  thread_key: string;
  sender_id: string;
  receiver_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  metadata?: any;
}

export interface Thread {
  threadKey: string;
  friendId: string;
  friendName: string;
  friendAvatar: string;
  lastMessage: Message;
  unreadCount: number;
}

export const messagesService = {
  /**
   * Helper to ensure header is set for code login
   */
  ensureHeader() {
    const session = getStudentSession();
    if (session?.accessCode) {
      setChildAccessCodeHeader(session.accessCode);
    }
  },

  /**
   * Envia uma mensagem para um amigo
   */
  async sendMessage(senderId: string, receiverId: string, body: string) {
    this.ensureHeader();
    
    const session = getStudentSession();
    // Fallback: enviar explicitamente se o header falhar (embora RPC leia header, podemos ajustar a RPC para aceitar param opcional se necessário)
    // Por enquanto, confiamos no header mas garantimos que a sessão existe
    if (!session?.accessCode && !session?.childId) {
       throw new Error('No active session found');
    }

    // Usar RPC segura para evitar problemas de RLS com usuário anônimo
    // O header x-child-access-code é injetado pelo interceptor do supabase-js se configurado globalmente,
    // mas nossa função setChildAccessCodeHeader altera a instância global.
    // Vamos garantir que a chamada RPC envie o header explicitamente nas options se possível,
    // mas supabase-js v2 não suporta headers por chamada RPC facilmente sem client customizado.
    // A função ensureHeader() altera `supabase.rest.headers`, que deve persistir.
    
    const { data, error } = await supabase.rpc('rpc_send_message_secure', {
      p_receiver_id: receiverId,
      p_body: body.trim(),
      p_access_code_fallback: session?.accessCode || undefined
    });

    if (error) {
      console.error('[MessageService] Send error:', error);
      throw error;
    }

    return data as Message;
  },

  /**
   * Lista as mensagens de uma thread (conversa com um amigo)
   */
  async getMessages(myId: string, friendId: string) {
    this.ensureHeader();
    const session = getStudentSession();
    
    // Usar RPC segura para leitura (evita problemas de RLS com subqueries)
    const { data, error } = await supabase.rpc('rpc_get_messages_secure', {
      p_child_id: myId,
      p_friend_id: friendId,
      p_access_code_fallback: session?.accessCode || undefined
    });

    if (error) {
      console.error('[MessageService] Get messages error:', error);
      throw error;
    }
    
    return data as Message[];
  },

  /**
   * Marca mensagens como lidas
   */
  async markAsRead(myId: string, friendId: string) {
    this.ensureHeader();
    const [minId, maxId] = [myId, friendId].sort();
    const threadKey = `${minId}:${maxId}`;

    // Atualiza apenas mensagens onde eu sou o receiver e não foram lidas
    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('thread_key', threadKey)
      .eq('receiver_id', myId)
      .is('read_at', null);

    if (error) throw error;
  },

  /**
   * Obtém lista de conversas (Inbox)
   * Nota: Como não temos tabela de threads, agregamos no cliente ou via RPC se necessário.
   * Para MVP, faremos uma query buscando mensagens onde sou participante e processamos.
   * Idealmente, criaríamos uma View no banco, mas vamos tentar fazer client-side primeiro se o volume for baixo.
   */
  async getInbox(myId: string) {
    this.ensureHeader();
    // Busca mensagens onde sou remetente ou destinatário
    // Limitando a últimas 500 para MVP para não explodir
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id(id, name, avatar),
        receiver:receiver_id(id, name, avatar)
      `)
      .or(`sender_id.eq.${myId},receiver_id.eq.${myId}`)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) throw error;

    // Agrupar por thread
    const threadsMap = new Map<string, Thread>();

    (data || []).forEach((msg: any) => {
      const isMeSender = msg.sender_id === myId;
      const friend = isMeSender ? msg.receiver : msg.sender;
      
      // Se amigo não existe (ex: deletado), pular
      if (!friend) return;

      const threadKey = msg.thread_key;

      if (!threadsMap.has(threadKey)) {
        threadsMap.set(threadKey, {
          threadKey,
          friendId: friend.id,
          friendName: friend.name,
          friendAvatar: friend.avatar,
          lastMessage: {
            id: msg.id,
            thread_key: msg.thread_key,
            sender_id: msg.sender_id,
            receiver_id: msg.receiver_id,
            body: msg.body,
            created_at: msg.created_at,
            read_at: msg.read_at
          },
          unreadCount: 0
        });
      }

      // Contar não lidas (apenas se eu for o receiver)
      if (msg.receiver_id === myId && !msg.read_at) {
        const thread = threadsMap.get(threadKey)!;
        thread.unreadCount += 1;
      }
    });

    return Array.from(threadsMap.values());
  }
};
