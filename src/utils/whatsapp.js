export function openWhatsapp(phone, name) {
  const text = encodeURIComponent(
    `Hola ${name}! Hemos hecho match en TENET 😄`,
  );

  window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
}
