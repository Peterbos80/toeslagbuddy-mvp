// Prioriteitswachtrij voor de jager: gevolgde en alarm-producten en recent
// gedaalde prijzen eerst; de lange staart minder vaak. Binaire heap.

// Hoe belangrijk is een URL nu?
export function prioriteit({ gevolgd = false, alarm = false, recentGedaald = false, tip = false, laatstBezocht = null, nu = Date.now(), score = 0 } = {}) {
  let p = score;
  if (alarm) p += 100;
  if (gevolgd) p += 60;
  if (recentGedaald) p += 30;
  if (tip) p += 40;
  if (laatstBezocht) {
    const uren = (nu - Date.parse(laatstBezocht)) / 36e5;
    // Lange staart: pas na een dag weer, daarna langzaam belangrijker
    if (!alarm && !gevolgd && uren < 24) p -= 50;
    p += Math.min(20, uren / 24);
  } else p += 10; // nooit bezocht
  return p;
}

export class Wachtrij {
  constructor() {
    this.heap = [];
    this.teller = 0;
    this.gezien = new Set();
  }
  get grootte() {
    return this.heap.length;
  }
  // Zelfde URL twee keer: alleen de eerste telt
  voegToe(item, p) {
    if (this.gezien.has(item.url)) return false;
    this.gezien.add(item.url);
    this.heap.push({ item, p, n: this.teller++ });
    this.#op(this.heap.length - 1);
    return true;
  }
  pak() {
    if (!this.heap.length) return null;
    const top = this.heap[0];
    const laatste = this.heap.pop();
    if (this.heap.length) {
      this.heap[0] = laatste;
      this.#neer(0);
    }
    return top.item;
  }
  // Hoger p eerst; bij gelijk: eerst toegevoegd eerst (stabiel)
  #voor(a, b) {
    return a.p > b.p || (a.p === b.p && a.n < b.n);
  }
  #op(i) {
    while (i > 0) {
      const o = (i - 1) >> 1;
      if (!this.#voor(this.heap[i], this.heap[o])) break;
      [this.heap[i], this.heap[o]] = [this.heap[o], this.heap[i]];
      i = o;
    }
  }
  #neer(i) {
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let b = i;
      if (l < this.heap.length && this.#voor(this.heap[l], this.heap[b])) b = l;
      if (r < this.heap.length && this.#voor(this.heap[r], this.heap[b])) b = r;
      if (b === i) return;
      [this.heap[i], this.heap[b]] = [this.heap[b], this.heap[i]];
      i = b;
    }
  }
}

// Shard van een domein (voor GitHub Actions-matrix): vast per domein
export function shardVan(domein, aantal) {
  let h = 0;
  for (const c of String(domein)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % aantal) + 1;
}
