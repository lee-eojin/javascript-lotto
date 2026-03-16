(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) return;
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) processPreload(link);
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") continue;
      for (const node of mutation.addedNodes) if (node.tagName === "LINK" && node.rel === "modulepreload") processPreload(node);
    }
  }).observe(document, {
    childList: true,
    subtree: true
  });
  function getFetchOpts(link) {
    const fetchOpts = {};
    if (link.integrity) fetchOpts.integrity = link.integrity;
    if (link.referrerPolicy) fetchOpts.referrerPolicy = link.referrerPolicy;
    if (link.crossOrigin === "use-credentials") fetchOpts.credentials = "include";
    else if (link.crossOrigin === "anonymous") fetchOpts.credentials = "omit";
    else fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep) return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
const { Random, Console } = window.MissionUtils;
class Lotto {
  static MIN_RANGE = 1;
  static MAX_RANGE = 45;
  static SIZE = 6;
  static ERROR = Object.freeze({
    DUPLICATE: "[ERROR] 로또 번호는 중복되지 않아야 합니다.",
    INVALID_RANGE: "[ERROR] 로또 번호는 1~45 사이의 숫자여야 합니다.",
    INVALID_SIZE: "[ERROR] 로또 번호는 6개여야 합니다."
  });
  #numbers;
  constructor(numbers) {
    this.#validate(numbers);
    this.#numbers = [...numbers].sort((a, b) => a - b);
  }
  #validate(numbers) {
    if (numbers.length !== Lotto.SIZE) {
      throw new Error(Lotto.ERROR.INVALID_SIZE);
    }
    if (new Set(numbers).size !== numbers.length) {
      throw new Error(Lotto.ERROR.DUPLICATE);
    }
    if (numbers.some((n) => n < Lotto.MIN_RANGE || n > Lotto.MAX_RANGE)) {
      throw new Error(Lotto.ERROR.INVALID_RANGE);
    }
  }
  hasNumber(number) {
    return this.#numbers.includes(number);
  }
  getNumbers() {
    return [...this.#numbers];
  }
}
const generateLottos = (count) => Array.from(
  { length: count },
  () => new Lotto(
    Random.pickUniqueNumbersInRange(
      Lotto.MIN_RANGE,
      Lotto.MAX_RANGE,
      Lotto.SIZE
    )
  )
);
class Money {
  static UNIT = 1e3;
  static ERROR = Object.freeze({
    INSUFFICIENT_AMOUNT: "[ERROR] 로또를 구매할 수 없습니다."
  });
  #amount;
  constructor(amount) {
    this.#validate(Number(amount));
    this.#amount = Number(amount);
  }
  #validate(amount) {
    if (Number.isNaN(amount) || amount < Money.UNIT) {
      throw new Error(Money.ERROR.INSUFFICIENT_AMOUNT);
    }
  }
  getMaximumLottoCount() {
    return Math.floor(this.#amount / Money.UNIT);
  }
}
class WinningNumber {
  static ERROR = Object.freeze({
    INVALID_RANGE: `[ERROR] 보너스 번호는 ${Lotto.MIN_RANGE}~${Lotto.MAX_RANGE} 사이의 숫자여야 합니다.`,
    DUPLICATE: "[ERROR] 보너스 번호는 당첨 번호와 중복될 수 없습니다."
  });
  #winningLotto;
  #bonusNumber;
  constructor(lotto, bonusNumber) {
    this.#validate(lotto, bonusNumber);
    this.#winningLotto = lotto;
    this.#bonusNumber = bonusNumber;
  }
  #validate(lotto, bonusNumber) {
    if (bonusNumber < Lotto.MIN_RANGE || bonusNumber > Lotto.MAX_RANGE) {
      throw new Error(WinningNumber.ERROR.INVALID_RANGE);
    }
    if (lotto.hasNumber(bonusNumber)) {
      throw new Error(WinningNumber.ERROR.DUPLICATE);
    }
  }
  getResult(lotto) {
    const matchLottoCount = this.#winningLotto.getNumbers().filter((num) => lotto.hasNumber(num)).length;
    const hasBonusNumber = lotto.hasNumber(this.#bonusNumber);
    return { matchCount: matchLottoCount, hasBonus: hasBonusNumber };
  }
}
class Rank {
  static FIRST = new Rank({ matchCount: 6, hasBonus: false, prize: 2e9 });
  static SECOND = new Rank({ matchCount: 5, hasBonus: true, prize: 3e7 });
  static THIRD = new Rank({ matchCount: 5, hasBonus: false, prize: 15e5 });
  static FOURTH = new Rank({ matchCount: 4, hasBonus: false, prize: 5e4 });
  static FIFTH = new Rank({ matchCount: 3, hasBonus: false, prize: 5e3 });
  static MISS = new Rank({ matchCount: 0, hasBonus: false, prize: 0 });
  static order = [Rank.FIFTH, Rank.FOURTH, Rank.THIRD, Rank.SECOND, Rank.FIRST];
  #matchCount;
  #hasBonus;
  #prize;
  constructor({ matchCount, hasBonus, prize }) {
    this.#matchCount = matchCount;
    this.#hasBonus = hasBonus;
    this.#prize = prize;
  }
  getPrize() {
    return this.#prize;
  }
  static getRank({ matchCount, hasBonus }) {
    if (matchCount === 6) return Rank.FIRST;
    if (matchCount === 5 && hasBonus) return Rank.SECOND;
    if (matchCount === 5) return Rank.THIRD;
    if (matchCount === 4) return Rank.FOURTH;
    if (matchCount === 3) return Rank.FIFTH;
    return Rank.MISS;
  }
  getResult() {
    return { matchCount: this.#matchCount, hasBonus: this.#hasBonus };
  }
}
class LottoResult {
  #rankCounts;
  constructor(lottos, winningNumber) {
    this.#rankCounts = this.#calculateRankCounts(lottos, winningNumber);
  }
  #calculateRankCounts(lottos, winningNumber) {
    const counts = new Map(Rank.order.map((rank) => [rank, 0]));
    lottos.forEach((lotto) => {
      const result = winningNumber.getResult(lotto);
      const rank = Rank.getRank(result);
      if (counts.has(rank)) {
        counts.set(rank, counts.get(rank) + 1);
      }
    });
    return counts;
  }
  getRankCount(rank) {
    return this.#rankCounts.get(rank) ?? 0;
  }
  getPrizeList() {
    return Rank.order.map((rank) => ({
      rank,
      count: this.#rankCounts.get(rank) ?? 0,
      prize: rank.getPrize()
    }));
  }
  getProfitRate(purchaseAmount) {
    const totalPrize = [...this.#rankCounts.entries()].reduce(
      (acc, [rank, count]) => acc + rank.getPrize() * count,
      0
    );
    return (totalPrize / purchaseAmount * 100).toFixed(1);
  }
}
class LottoManager {
  #lottos = [];
  buyLottos(amount) {
    const money = new Money(amount);
    this.#lottos = generateLottos(money.getMaximumLottoCount());
    return this.#lottos.map((lotto) => lotto.getNumbers());
  }
  createWinningLotto(numbers) {
    return new Lotto(numbers);
  }
  createWinningNumber(winningLotto, bonus) {
    return new WinningNumber(winningLotto, bonus);
  }
  getLotteryResult(winningNumber) {
    const result = new LottoResult(this.#lottos, winningNumber);
    return {
      prizeList: result.getPrizeList().map(({ rank, count, prize }) => {
        const { matchCount, hasBonus } = rank.getResult();
        return { matchCount, hasBonus, count, prize };
      }),
      profitRate: result.getProfitRate(Money.UNIT * this.#lottos.length)
    };
  }
}
class PriceInputForm {
  #onSubmit;
  #elements;
  constructor({ onSubmit }) {
    this.#onSubmit = onSubmit;
  }
  mount(container) {
    const { section, form, input, errorMessage } = this.#createElement();
    this.#elements = { section, input, errorMessage };
    form.addEventListener("submit", this.#handleSubmit.bind(this));
    container.appendChild(section);
  }
  unmount() {
    this.#elements.section.remove();
  }
  showError(message) {
    this.#elements.errorMessage.textContent = message;
  }
  clearError() {
    this.#elements.errorMessage.textContent = "";
  }
  clearInput() {
    this.#elements.input.value = "";
  }
  #handleSubmit(event) {
    event.preventDefault();
    this.#onSubmit(this.#elements.input.value);
  }
  #createElement() {
    const section = document.createElement("div");
    section.className = "purchase-section";
    const form = document.createElement("form");
    form.className = "purchase-section__form";
    const input = document.createElement("input");
    input.type = "text";
    input.className = "purchase-section__input";
    input.placeholder = "구입할 금액을 입력해주세요.";
    const button = document.createElement("button");
    button.type = "submit";
    button.className = "purchase-section__btn caption";
    button.textContent = "구입";
    const errorMessage = document.createElement("p");
    errorMessage.className = "error-message";
    form.append(input, button);
    section.append(form, errorMessage);
    return { section, form, input, errorMessage };
  }
}
class LottoList {
  #elements;
  mount(container) {
    const { section, count, items } = this.#createElement();
    this.#elements = { section, count, items };
    container.appendChild(section);
  }
  unmount() {
    this.#elements.section.remove();
  }
  render(lottos) {
    const { count, items } = this.#elements;
    count.textContent = `총 ${lottos.length}개를 구매하였습니다.`;
    const fragment = document.createDocumentFragment();
    lottos.forEach((numbers) => {
      fragment.appendChild(this.#createLottoItem(numbers));
    });
    items.replaceChildren(fragment);
  }
  #createLottoItem(numbers) {
    const item = document.createElement("li");
    item.className = "lotto-item";
    const icon = document.createElement("span");
    icon.className = "lotto-item__icon";
    icon.textContent = "🎟️";
    const numbersText = document.createElement("span");
    numbersText.textContent = numbers.join(", ");
    item.append(icon, numbersText);
    return item;
  }
  #createElement() {
    const section = document.createElement("div");
    section.className = "lotto-list";
    const count = document.createElement("p");
    count.className = "lotto-list__count";
    const items = document.createElement("ul");
    items.className = "lotto-list__items";
    section.append(count, items);
    return { section, count, items };
  }
}
class WinningNumbersInputForm {
  #onSubmit;
  #elements;
  constructor({ onSubmit }) {
    this.#onSubmit = onSubmit;
  }
  mount(container) {
    const { section, form, winningInputs, bonusInput, errorMessage } = this.#createElement();
    this.#elements = { section, winningInputs, bonusInput, errorMessage };
    form.addEventListener("submit", this.#handleSubmit.bind(this));
    container.appendChild(section);
  }
  unmount() {
    this.#elements.section.remove();
  }
  showError(message) {
    this.#elements.errorMessage.textContent = message;
  }
  clearError() {
    this.#elements.errorMessage.textContent = "";
  }
  #handleSubmit(event) {
    event.preventDefault();
    const { winningInputs, bonusInput } = this.#elements;
    const winningNumbers = winningInputs.map((input) => Number(input.value));
    const bonusNumber = Number(bonusInput.value);
    if ([...winningNumbers, bonusNumber].some(isNaN)) {
      this.showError("[ERROR] 숫자를 입력해주세요.");
      return;
    }
    this.#onSubmit({ winningNumbers, bonusNumber });
  }
  #createNumberInputs(count) {
    return Array.from({ length: count }, () => {
      const input = document.createElement("input");
      input.type = "text";
      input.className = "number-input";
      input.maxLength = 2;
      return input;
    });
  }
  #createNumberGroup(labelText, inputs) {
    const fieldset = document.createElement("fieldset");
    fieldset.className = "number-group";
    const legend = document.createElement("legend");
    legend.className = "number-group__label";
    legend.textContent = labelText;
    const fields = document.createElement("div");
    fields.className = "number-group__fields";
    fields.append(...inputs);
    fieldset.append(legend, fields);
    return fieldset;
  }
  #createElement() {
    const section = document.createElement("div");
    section.className = "winning-section";
    const inputsRow = document.createElement("div");
    inputsRow.className = "winning-section__inputs";
    const winningInputs = this.#createNumberInputs(6);
    const [bonusInput] = this.#createNumberInputs(1);
    const winningGroup = this.#createNumberGroup("당첨 번호", winningInputs);
    const bonusGroup = this.#createNumberGroup("보너스 번호", [bonusInput]);
    bonusGroup.classList.add("number-group--bonus");
    const form = document.createElement("form");
    form.className = "winning-section__form";
    const button = document.createElement("button");
    button.type = "submit";
    button.className = "result-btn caption";
    button.textContent = "결과 확인하기";
    const errorMessage = document.createElement("p");
    errorMessage.className = "error-message";
    const description = document.createElement("p");
    description.textContent = "지난 주 당첨번호 6개와 보너스 번호 1개를 입력해주세요.";
    inputsRow.append(winningGroup, bonusGroup);
    form.append(inputsRow, button, errorMessage);
    section.append(description, form);
    return { section, form, winningInputs, bonusInput, errorMessage };
  }
}
class GameResultDialog {
  #onRestart;
  #elements;
  constructor({ onRestart }) {
    this.#onRestart = onRestart;
  }
  mount(container) {
    const { dialog, tbody, profitRate, closeBtn, restartBtn } = this.#createElement();
    this.#elements = { dialog, tbody, profitRate };
    closeBtn.addEventListener("click", () => dialog.close());
    restartBtn.addEventListener("click", () => {
      dialog.close();
      this.#onRestart();
    });
    container.appendChild(dialog);
  }
  unmount() {
    this.#elements.dialog.remove();
  }
  open(prizeList, profitRate) {
    this.#renderTable(prizeList);
    this.#elements.profitRate.textContent = `당신의 총 수익률은 ${profitRate}%입니다.`;
    this.#elements.dialog.showModal();
  }
  #renderTable(prizeList) {
    const { tbody } = this.#elements;
    const fragment = document.createDocumentFragment();
    prizeList.forEach(({ matchCount, hasBonus, prize, count }) => {
      const row = document.createElement("tr");
      const matchCell = document.createElement("td");
      matchCell.textContent = hasBonus ? `${matchCount}개+보너스볼` : `${matchCount}개`;
      const prizeCell = document.createElement("td");
      prizeCell.textContent = prize.toLocaleString();
      const countCell = document.createElement("td");
      countCell.textContent = `${count}개`;
      row.append(matchCell, prizeCell, countCell);
      fragment.appendChild(row);
    });
    tbody.replaceChildren(fragment);
  }
  #createTable() {
    const table = document.createElement("table");
    table.className = "result-table";
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    ["일치 갯수", "당첨금", "당첨 갯수"].forEach((text) => {
      const th = document.createElement("th");
      th.textContent = text;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    const tbody = document.createElement("tbody");
    table.append(thead, tbody);
    return { table, tbody };
  }
  #createElement() {
    const dialog = document.createElement("dialog");
    dialog.className = "lotto-result-dialog";
    const inner = document.createElement("div");
    inner.className = "lotto-result-dialog__inner";
    const closeBtn = document.createElement("button");
    closeBtn.className = "lotto-result-dialog__close";
    closeBtn.textContent = "✕";
    const title = document.createElement("h2");
    title.className = "lotto-result-dialog__title";
    title.textContent = "🏆 당첨 통계 🏆";
    const { table, tbody } = this.#createTable();
    const profitRate = document.createElement("p");
    profitRate.className = "lotto-result-dialog__profit-rate";
    const restartBtn = document.createElement("button");
    restartBtn.className = "restart-btn caption";
    restartBtn.textContent = "다시 시작하기";
    inner.append(closeBtn, title, table, profitRate, restartBtn);
    dialog.appendChild(inner);
    return { dialog, tbody, profitRate, closeBtn, restartBtn };
  }
}
class WebApp {
  #manager = new LottoManager();
  #priceForm;
  #lottoList;
  #winningForm;
  #resultDialog;
  #lottoListSection;
  #winningSection;
  constructor() {
    this.#priceForm = new PriceInputForm({ onSubmit: this.#handlePurchaseSubmit.bind(this) });
    this.#resultDialog = new GameResultDialog({ onRestart: this.#handleRestart.bind(this) });
    this.#lottoListSection = document.querySelector("#lotto-list-section");
    this.#winningSection = document.querySelector("#winning-section");
    this.#priceForm.mount(document.querySelector("#purchase-section"));
    this.#resultDialog.mount(document.body);
  }
  #handlePurchaseSubmit(value) {
    try {
      const lottos = this.#manager.buyLottos(Number(value));
      this.#priceForm.clearError();
      if (this.#lottoList) this.#lottoList.unmount();
      if (this.#winningForm) this.#winningForm.unmount();
      this.#lottoList = new LottoList();
      this.#lottoList.mount(this.#lottoListSection);
      this.#lottoList.render(lottos);
      this.#winningForm = new WinningNumbersInputForm({
        onSubmit: this.#handleWinningSubmit.bind(this)
      });
      this.#winningForm.mount(this.#winningSection);
    } catch (error) {
      this.#priceForm.showError(error.message);
    }
  }
  #handleWinningSubmit({ winningNumbers, bonusNumber }) {
    try {
      const winningLotto = this.#manager.createWinningLotto(winningNumbers);
      const winningNumber = this.#manager.createWinningNumber(winningLotto, bonusNumber);
      const { prizeList, profitRate } = this.#manager.getLotteryResult(winningNumber);
      this.#winningForm.clearError();
      this.#resultDialog.open(prizeList, profitRate);
    } catch (error) {
      this.#winningForm.showError(error.message);
    }
  }
  #handleRestart() {
    this.#lottoList.unmount();
    this.#winningForm.unmount();
    this.#lottoList = null;
    this.#winningForm = null;
    this.#manager = new LottoManager();
    this.#priceForm.clearInput();
  }
}
new WebApp();
