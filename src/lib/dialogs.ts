// Janelas de confirmação do próprio sistema. As janelas nativas do navegador (confirm/prompt) somem em
// navegadores embutidos — o painel do app do Claude e o navegador de dentro de outros apps respondem
// "Cancelar" sem mostrar nada —, e o botão "não fazia nada" sem aviso. Aqui o pedido entra numa fila e o
// DialogHost, montado uma vez na área logada, mostra um de cada vez.

export type ConfirmOptions = { title: string; message?: string; confirmLabel?: string; danger?: boolean };
export type TextOptions = ConfirmOptions & { label: string; defaultValue?: string; minLength?: number; maxLength?: number; multiline?: boolean };

export type DialogRequest =
  | ({ id: number; kind: "confirm"; resolve: (answer: boolean) => void } & ConfirmOptions)
  | ({ id: number; kind: "text"; resolve: (answer: string | null) => void } & TextOptions);

let queue: DialogRequest[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function enqueue(request: DialogRequest) {
  queue = [...queue, request];
  listeners.forEach((listener) => listener());
}

export function subscribeDialogs(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function currentDialog(): DialogRequest | null {
  return queue[0] ?? null;
}

// Sim = true; texto = o que foi escrito, sem espaços nas pontas; cancelar = false / null.
export function answerDialog(id: number, answer: boolean | string | null) {
  const request = queue.find((item) => item.id === id);
  if (!request) return;
  queue = queue.filter((item) => item.id !== id);
  listeners.forEach((listener) => listener());
  if (request.kind === "confirm") request.resolve(answer === true);
  else request.resolve(typeof answer === "string" ? answer.trim() : null);
}

export function askConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => enqueue({ ...options, id: nextId++, kind: "confirm", resolve }));
}

export function askText(options: TextOptions): Promise<string | null> {
  return new Promise((resolve) => enqueue({ ...options, id: nextId++, kind: "text", resolve }));
}

export function textDialogError(value: string, options: Pick<TextOptions, "minLength" | "maxLength">): string | null {
  const length = value.trim().length;
  if (options.minLength && length < options.minLength) return options.minLength === 1 ? "Preencha este campo." : `Escreva pelo menos ${options.minLength} caracteres.`;
  if (options.maxLength && length > options.maxLength) return `Escreva até ${options.maxLength} caracteres.`;
  return null;
}
