var fonts = [];
document.fonts.forEach((font) => {
  fonts.push({
    family: font.family,
    display: font.display,
    status: font.status,
    style: font.style,
    weight: font.weight,
  });
});

return fonts;
