import { LspDecoderStream, LspEncoderStream } from "@kuuote/lsp-stream";
import { JsonStringifyStream } from "@std/json";
import * as m from "./message.ts";
import { Promisify } from "../interface.ts";

type Resolvers = {
  resolve: (r: unknown) => void;
  reject: (e: unknown) => void;
};

export class JsonRpcClient {
  #process: Deno.ChildProcess;
  #writer: WritableStreamDefaultWriter;

  requestHandlers: ((msg: m.RequestMessage) => Promisify<unknown>)[] = [];
  notifyHandlers: ((msg: m.NotificationMessage) => Promisify<void>)[] = [];

  #requestId = 1;
  #requestPool: Record<number, Resolvers> = {};

  constructor(cmd: string[]) {
    this.#process = new Deno.Command(cmd[0], {
      args: cmd.slice(1),
      stdin: "piped",
      stdout: "piped",
    }).spawn();

    const stream = new JsonStringifyStream();
    stream.readable
      .pipeThrough(new LspEncoderStream())
      .pipeTo(this.#process.stdin);
    this.#writer = stream.writable.getWriter();

    this.#process.stdout
      .pipeThrough(new LspDecoderStream())
      .pipeTo(
        new WritableStream({
          write: async (chunk: string) => {
            const received = JSON.parse(chunk);
            if (m.isRequestMessage(received)) {
              for (const handler of this.requestHandlers) {
                const result = await handler(received);
                if (result !== undefined) {
                  this.#send({
                    jsonrpc: "2.0",
                    id: received.id,
                    result,
                  });
                  return;
                }
              }
            } else if (m.isNotificationMessage(received)) {
              for (const handler of this.notifyHandlers) {
                await handler(received);
              }
            } else if (m.isResponseMessage(received)) {
              const id = Number(received.id);
              const cb = this.#requestPool[id];
              if (cb != null) {
                if (received.result !== undefined) {
                  cb.resolve(received.result);
                } else if (received.error != null) {
                  cb.reject(received.error);
                }
                delete this.#requestPool[id];
              }
            }
          },
        }),
      );
  }

  async #send(msg: unknown) {
    await this.#writer.write(msg);
  }

  async request(
    method: string,
    params?: m.RequestMessage["params"],
  ): Promise<unknown> {
    const id = this.#requestId++;
    const msg: m.RequestMessage = {
      jsonrpc: "2.0",
      id,
      method,
    };
    if (params != null) {
      msg.params = params;
    }
    await this.#send(msg);
    const { promise, resolve, reject } = Promise.withResolvers();
    this.#requestPool[id] = { resolve, reject };
    return promise;
  }

  async notify(
    method: string,
    params?: m.RequestMessage["params"],
  ): Promise<void> {
    const msg: m.NotificationMessage = {
      jsonrpc: "2.0",
      method,
    };
    if (params != null) {
      msg.params = params;
    }
    await this.#send(msg);
  }
}
