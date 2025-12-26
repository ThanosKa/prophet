import fs from "fs";
import path from "path";

const base64Icon =
  "iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAMAAAD04JH5AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAAZQTFRF///AAAAA67vW0wAAAAF0Uk5TAEDm2GYAAAAsSURBVHja7cEBDAAAAMOg+VPf4ARVAAAAAAAAAAAAAAAAAAAAAAAAAAAA4DYYAAGAL06fAAAAAElFTkSuQmCC";

const buffer = Buffer.from(base64Icon, "base64");
const dir = "apps/sidepanel/public/images";

const sizes = [16, 48, 128];

sizes.forEach((size) => {
  const filePath = path.join(dir, `icon-${size}.png`);
  fs.writeFileSync(filePath, buffer);
  console.log(`Created ${filePath}`);
});
