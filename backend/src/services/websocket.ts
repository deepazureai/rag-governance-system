/**
 * WebSocket Service
 * Handles real-time progress streaming for batch evaluations
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import { EvaluationService } from '../services/evaluation.js';
import { FrameworkType } from '../frameworks/registry.js';

export interface WebSocketMessage {
  type: 'evaluation' | 'evaluation_complete' | 'progress' | 'batch_progress' | 'batch_complete' | 'error' | 'complete' | 'subscribed' | 'pong';
  data: unknown;
}

export class WebSocketService {
  private wss: WebSocketServer;
  private evaluationService: EvaluationService;
  private activeConnections: Map<string, Set<WebSocket>> = new Map();

  constructor(server: HTTPServer, evaluationService: EvaluationService) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.evaluationService = evaluationService;
    this.setupConnections();
  }

  private setupConnections(): void {
    this.wss.on('connection', (ws: WebSocket, req: any) => {
      console.log('[WebSocket] New connection');

      ws.on('message', async (message: string) => {
        try {
          const data = JSON.parse(message);
          await this.handleMessage(ws, data);
        } catch (error) {
          console.error('[WebSocket] Message parsing error:', error);
          ws.send(
            JSON.stringify({
              type: 'error',
              data: { message: 'Invalid message format' },
            })
          );
        }
      });

      ws.on('close', () => {
        console.log('[WebSocket] Connection closed');
        this.removeConnection(ws);
      });

      ws.on('error', (error: any) => {
        console.error('[WebSocket] Connection error:', error);
      });
    });
  }

  private async handleMessage(ws: WebSocket, data: any): Promise<void> {
    const { type, payload } = data;

    switch (type) {
      case 'start_evaluation':
        await this.handleStartEvaluation(ws, payload);
        break;

      case 'start_batch_evaluation':
        await this.handleStartBatchEvaluation(ws, payload);
        break;

      case 'subscribe':
        this.handleSubscribe(ws, payload);
        break;

      case 'unsubscribe':
        this.handleUnsubscribe(ws, payload);
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;

      default:
        console.warn('[WebSocket] Unknown message type:', type);
    }
  }

  private async handleStartEvaluation(ws: WebSocket, payload: any): Promise<void> {
    const { appId, query, response, retrievedDocuments, framework } = payload;

    try {
      const result = await this.evaluationService.evaluateQuery(
        appId,
        query,
        response,
        retrievedDocuments,
        framework as FrameworkType | undefined
      );

      ws.send(
        JSON.stringify({
          type: 'evaluation_complete',
          data: result,
        })
      );
    } catch (error: any) {
      ws.send(
        JSON.stringify({
          type: 'error',
          data: { message: error.message },
        })
      );
    }
  }

  private async handleStartBatchEvaluation(ws: WebSocket, payload: any): Promise<void> {
    const { batchId, appId, evaluations, framework } = payload;

    try {
      const results = await this.evaluationService.evaluateBatch(
        appId,
        evaluations,
        framework as FrameworkType | undefined,
        (progress) => {
          // Send progress update
          this.broadcast(batchId, {
            type: 'batch_progress',
            data: progress,
          });
        }
      );

      this.broadcast(batchId, {
        type: 'batch_complete',
        data: {
          batchId,
          completed: evaluations.length,
          results,
        },
      });
    } catch (error: any) {
      this.broadcast(batchId, {
        type: 'error',
        data: { message: error.message },
      });
    }
  }

  private handleSubscribe(ws: WebSocket, payload: any): void {
    const { channel } = payload;

    if (!this.activeConnections.has(channel)) {
      this.activeConnections.set(channel, new Set());
    }

    this.activeConnections.get(channel)!.add(ws);
    console.log(`[WebSocket] Client subscribed to ${channel}`);

    ws.send(
      JSON.stringify({
        type: 'subscribed',
        data: { channel },
      })
    );
  }

  private handleUnsubscribe(ws: WebSocket, payload: any): void {
    const { channel } = payload;

    if (this.activeConnections.has(channel)) {
      this.activeConnections.get(channel)!.delete(ws);
    }

    console.log(`[WebSocket] Client unsubscribed from ${channel}`);
  }

  private removeConnection(ws: WebSocket): void {
    for (const subscribers of this.activeConnections.values()) {
      subscribers.delete(ws);
    }
  }

  private broadcast(channel: string, message: WebSocketMessage): void {
    const subscribers = this.activeConnections.get(channel);

    if (!subscribers) {
      return;
    }

    const payload = JSON.stringify(message);

    for (const client of subscribers) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  public close(): void {
    console.log('[WebSocket] Closing WebSocket server');
    this.activeConnections.clear();
    this.wss.close();
  }
}

export function createWebSocketService(
  server: HTTPServer,
  evaluationService: EvaluationService
): WebSocketService {
  return new WebSocketService(server, evaluationService);
}
