import { is, PredicateType } from "@core/unknownutil";

// https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#abstractMessage
export const isMessage = is.ObjectOf({
  jsonrpc: is.LiteralOf("2.0"),
});
export type Message = PredicateType<typeof isMessage>;

// https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#requestMessage
export const isRequestMessage = is.IntersectionOf([
  isMessage,
  is.ObjectOf({
    id: is.UnionOf([
      is.Number,
      is.String,
    ]),
    method: is.String,
    params: is.OptionalOf(
      is.UnionOf([
        is.Array,
        is.Record,
      ]),
    ),
  }),
]);
export type RequestMessage = PredicateType<typeof isRequestMessage>;

// https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#responseMessage
export const isResponseError = is.ObjectOf({
  code: is.Number,
  message: is.String,
  data: is.OptionalOf(
    is.UnionOf([
      is.String,
      is.Number,
      is.Boolean,
      is.Array,
      is.Record,
      is.Null,
    ]),
  ),
});
export type ResponseError = PredicateType<typeof isResponseError>;

export const isResponseMessage = is.IntersectionOf([
  isMessage,
  is.ObjectOf({
    id: is.UnionOf([
      is.Number,
      is.String,
      is.Null,
    ]),
    result: is.OptionalOf(
      is.UnionOf([
        is.String,
        is.Number,
        is.Boolean,
        is.Array,
        is.Record,
        is.Null,
      ]),
    ),
    error: is.OptionalOf(isResponseError),
  }),
]);
export type ResponseMessage = PredicateType<typeof isResponseMessage>;

// https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#notificationMessage
export const isNotificationMessage = is.IntersectionOf([
  isMessage,
  is.ObjectOf({
    method: is.String,
    params: is.OptionalOf(
      is.UnionOf([
        is.Array,
        is.Record,
      ]),
    ),
  }),
]);
export type NotificationMessage = PredicateType<typeof isNotificationMessage>;
