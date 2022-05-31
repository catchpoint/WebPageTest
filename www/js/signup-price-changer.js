function changePrice(type) {
  const result = document.querySelector('.' + type + ' .price span');
  result.textContent = event.target.options[event.target.selectedIndex].dataset.price
}