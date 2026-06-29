import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export function createStompClient(token: string): Client {
  const client = new Client({
    webSocketFactory: () =>
      new SockJS(`${process.env.NEXT_PUBLIC_API_URL}/ws`),
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 5000,
  });
  return client;
}
