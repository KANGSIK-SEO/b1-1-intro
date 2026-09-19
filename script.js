const greetings = [
  "방문해 주셔서 감사합니다! 😊",
  "반갑습니다, 좋은 하루 되세요!",
  "함께 성장해요 🚀",
];
let i = 0;
document.getElementById("btn").addEventListener("click", () => {
  document.getElementById("msg").textContent = greetings[i++ % greetings.length];
});
