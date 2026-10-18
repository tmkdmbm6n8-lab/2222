export type ClientRequest = { kind: string; status: string };

export function clientSummary(requests: readonly ClientRequest[]) {
  const orders = requests.filter(request => request.kind === 'booking');
  return {
    orders: orders.length,
    completed: orders.filter(request => request.status === 'completed').length,
    upcoming: orders.filter(request => request.status === 'pending' || request.status === 'confirmed').length,
  };
}