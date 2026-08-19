export class TotalScrollSize {
  private total: number;

  constructor(total: number) {
    this.total = total;
  }

  getTotal() {
    return this.total;
  }

  updateTotal(prevRowSize: number, nexRowSize: number) {
    this.total -= prevRowSize;
    this.total += nexRowSize;
  }
}
