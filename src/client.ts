import { toFileUrl } from "@std/path";
import { assert, is } from "@core/unknownutil";
import { LSP } from "./deps.ts";
import { JsonRpcClient } from "./json_rpc/client.ts";
import { NotifyHandler, RequestHandler } from "./interface.ts";

export class Client {
  #rpcClient: JsonRpcClient;

  #requestHandlers: Record<string, RequestHandler[]> = {};
  #notifyHandlers: Record<string, NotifyHandler[]> = {};

  constructor(cmd: string[]) {
    this.#rpcClient = new JsonRpcClient(cmd);

    this.#rpcClient.requestHandlers.push(async (msg) => {
      for (const handler of this.#requestHandlers[msg.method] ?? []) {
        const result = await handler(msg.params);
        if (result !== undefined) {
          return result;
        }
      }
    });
    this.#rpcClient.notifyHandlers.push(async (msg) => {
      for (const handler of this.#notifyHandlers[msg.method] ?? []) {
        await handler(msg.params);
      }
    });
  }

  async initialize() {
    await this.request(
      "initialize",
      {
        processId: null,
        rootUri: null,
        capabilities: {},
      },
    );
    await this.notify("initialized", {});
  }

  async open(
    path: string,
    languageId?: string,
  ) {
    if (languageId == null) {
      languageId = path.replace(/.*\./, "");
    }
    const uri = toFileUrl(path).toString();
    const text = await Deno.readTextFile(path);
    const params: LSP.DidOpenTextDocumentParams = {
      textDocument: {
        uri,
        languageId,
        version: 1,
        text,
      },
    };
    await this.notify("textDocument/didOpen", params);
  }

  async request(
    method: string,
    params?: unknown,
  ): Promise<unknown> {
    assert(params, is.UnionOf([is.Array, is.Record]));
    return await this.#rpcClient.request(method, params);
  }

  async notify(
    method: string,
    params?: unknown,
  ): Promise<void> {
    assert(params, is.UnionOf([is.Array, is.Record]));
    await this.#rpcClient.notify(method, params);
  }

  subscribeRequest(
    method: string,
    handler: RequestHandler,
  ) {
    this.#requestHandlers[method] = [
      ...this.#requestHandlers[method] ?? [],
      handler,
    ];
  }

  subscribeNotify(
    method: string,
    handler: NotifyHandler,
  ) {
    this.#notifyHandlers[method] = [
      ...this.#notifyHandlers[method] ?? [],
      handler,
    ];
  }
}
