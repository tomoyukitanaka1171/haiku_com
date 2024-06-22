import { DataSource } from "typeorm";
import haikus from "./json/haikus.json" with { type: "json" };
import haijins from "./json/haijins.json" with { type: "json" };
import { Kigo } from "../model/Kigo";
import { Haiku } from "../model/Haiku";
import { Poets } from "../model/Poet";
import kigosJson from "./json/kigo.json" with { type: "json" };

export const insertHaikus = async (source: DataSource) => {
  const first = await source.getRepository(Haiku).find({
    where: {
      id: 400,
    },
  });

  if (first.length) return;

  const json = Array.from(
    new Map(haikus.map((haiku) => [haiku.text, haiku])).values()
  );

  json.map(async (j) => {
    const haikuEntity = new Haiku();
    haikuEntity.text = j.text;
    haikuEntity.textKana = j.text_kana;
    haikuEntity.description = null;
    haikuEntity.likesCount = 0;
    await source.getRepository(Haiku).save(haikuEntity);
  });
};
