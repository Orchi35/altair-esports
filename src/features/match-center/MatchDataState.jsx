export function MatchDataState({ status, kind, lang }) {
  if (status === "loading" || status === "stale") return null;
  const messages = {
    results:{
      empty:{ TR:"Henüz doğrulanmış maç sonucu bulunmuyor.", EN:"No verified match results are available yet." },
      "season-ended":{ TR:"Sezon tamamlandı. Doğrulanmış sonuç arşivi burada kalacak.", EN:"The season has ended. Verified results will remain available here." },
      unavailable:{ TR:"Maç verisi geçici olarak kullanılamıyor. Süresi geçmiş sonuçlar gösterilmiyor.", EN:"Match data is temporarily unavailable. Expired results are not shown." },
      error:{ TR:"Maç sonuçları şu anda doğrulanamıyor. Eski veri gösterilmiyor.", EN:"Results cannot be verified right now. Expired data is not shown." },
    },
    fixtures:{
      empty:{ TR:"Aktif sezonda doğrulanmış yaklaşan maç bulunmuyor.", EN:"There are no verified upcoming matches in the active season." },
      "season-ended":{ TR:"Sezon tamamlandı. Yeni sezon fikstürü doğrulandığında burada yayınlanacak.", EN:"The season has ended. The next verified schedule will appear here." },
      unavailable:{ TR:"Fikstür verisi geçici olarak kullanılamıyor. Süresi geçmiş maçlar gösterilmiyor.", EN:"Fixture data is temporarily unavailable. Expired matches are not shown." },
      error:{ TR:"Fikstür şu anda doğrulanamıyor. Eski veri gösterilmiyor.", EN:"Fixtures cannot be verified right now. Expired data is not shown." },
    },
    standings:{
      empty:{ TR:"Doğrulanmış puan durumu bulunmuyor.", EN:"No verified standings are available." },
      "season-ended":{ TR:"Sezon tamamlandı.", EN:"The season has ended." },
      unavailable:{ TR:"Puan durumu geçici olarak kullanılamıyor.", EN:"Standings are temporarily unavailable." },
      error:{ TR:"Puan durumu şu anda doğrulanamıyor.", EN:"Standings cannot be verified right now." },
    },
  };
  const message = messages[kind]?.[status]?.[lang];
  return message ? <div className="match-data-empty" role="status">{message}</div> : null;
}
