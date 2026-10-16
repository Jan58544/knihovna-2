const RAW_GENRES = [
  'Fantasy',
  'Epická fantasy',
  'High fantasy',
  'Low fantasy',
  'Dark fantasy',
  'Grimdark fantasy',
  'Urban fantasy',
  'Romantasy',
  'Cozy fantasy',
  'Historická fantasy',
  'Pohádková fantasy',
  'Mytická fantasy',
  'Hrdinská fantasy',
  'Politická fantasy',
  'Vojenská fantasy',
  'Magický realismus',
  'Sci-fi',
  'Hard sci-fi',
  'Soft sci-fi',
  'Space opera',
  'Cyberpunk',
  'Steampunk',
  'Dieselpunk',
  'Solarpunk',
  'Biopunk',
  'Dystopie',
  'Utopie',
  'Postapokalyptická literatura',
  'Alternativní historie',
  'Cestování časem',
  'Paralelní vesmíry',
  'Vesmírná sci-fi',
  'Vojenská sci-fi',
  'Romantická sci-fi',
  'Romantika',
  'Současná romance',
  'Historická romance',
  'Romantická komedie',
  'Tragická romance',
  'Erotická romance',
  'Dark romance',
  'Paranormální romance',
  'LGBTQ+ romance',
  'Queer romance',
  'YA romance',
  'New Adult romance',
  'Sportovní romance',
  'Zakázaná láska',
  'Milostný trojúhelník',
  'Enemies to lovers',
  'Friends to lovers',
  'Slow burn',
  'Fake dating',
  'Detektivka',
  'Krimi',
  'Severská krimi',
  'Noir',
  'Hardboiled detektivka',
  'Policejní detektivka',
  'Psychologická detektivka',
  'Historická detektivka',
  'Forenzní krimi',
  'Právnická krimi',
  'Lékařská krimi',
  'True crime',
  'Cozy mystery',
  'Gangsterská literatura',
  'Mafiánské příběhy',
  'Špionážní literatura',
  'Thriller',
  'Psychologický thriller',
  'Akční thriller',
  'Kriminální thriller',
  'Právnický thriller',
  'Lékařský thriller',
  'Politický thriller',
  'Erotický thriller',
  'Technologický thriller',
  'Konspirační thriller',
  'Survival thriller',
  'Horor',
  'Psychologický horor',
  'Gotický horor',
  'Nadpřirozený horor',
  'Kosmický horor',
  'Body horror',
  'Gore',
  'Splatterpunk',
  'Slasher',
  'Folk horror',
  'Náboženský horor',
  'Démonický horor',
  'Zombie horor',
  'Upírský horor',
  'Vlkodlačí horor',
  'Horor s duchy',
  'Horor s monstry',
  'Apokalyptický horor',
  'Mysteriózní horor',
  'Hororová romance',
  'Hororová komedie',
  'Mysteriózní literatura',
  'Záhadné příběhy',
  'Paranormální záhady',
  'Konspirační příběhy',
  'Okultní literatura',
  'Dobrodružná literatura',
  'Cestovatelské romány',
  'Pirátské příběhy',
  'Námořní dobrodružství',
  'Survival',
  'Western',
  'Road trip',
  'Válečná literatura',
  'Historický román',
  'Historické drama',
  'Historická sága',
  'Historická fikce',
  'Antická literatura',
  'Středověké příběhy',
  'Viktoriánská literatura',
  'Rodinná sága',
  'Společenský román',
  'Psychologický román',
  'Rodinné drama',
  'Vztahové drama',
  'Generační román',
  'Bildungsroman',
  'Coming-of-age',
  'Realistická literatura',
  'Naturalismus',
  'Romantismus',
  'Modernismus',
  'Postmodernismus',
  'Existenciální literatura',
  'Filozofický román',
  'Satira',
  'Společenská satira',
  'Humoristická literatura',
  'Absurdní literatura',
  'Groteska',
  'Parodie',
  'Komedie',
  'Tragédie',
  'Melodrama',
  'Literární fikce',
  'Experimentální literatura',
  'Magický realismus',
  'Surrealismus',
  'Absurdismus',
  'Alegorie',
  'Bajka',
  'Pohádka',
  'Autorská pohádka',
  'Lidová pohádka',
  'Báje',
  'Mýty',
  'Legendy',
  'Pověsti',
  'Epos',
  'Balada',
  'Novela',
  'Román',
  'Povídka',
  'Krátká povídka',
  'Mikrofiction',
  'Poezie',
  'Lyrika',
  'Epika',
  'Drama',
  'Divadelní hra',
  'Historická dramata',
  'Literatura pro děti',
  'Literatura pro mládež',
  'Young adult (YA)',
  'New adult (NA)',
  'Middle grade',
  'Obrázkové knihy',
  'Pohádkové knihy',
  'Školní příběhy',
  'Školní romance',
  'Internátní příběhy',
  'Feel-good literatura',
  'Cozy literatura',
  'Inspirativní literatura',
  'Motivační literatura',
  'Duchovní literatura',
  'Náboženská literatura',
  'Křesťanská literatura',
  'Biblické příběhy',
  'Filozofie',
  'Psychologie',
  'Populární psychologie',
  'Osobní rozvoj',
  'Seberozvoj',
  'Autobiografie',
  'Biografie',
  'Memoáry',
  'Deníky',
  'Cestopisy',
  'Reportáže',
  'Eseje',
  'Publicistika',
  'Historická literatura faktu',
  'Populárně-naučná literatura',
  'Vědecká literatura',
  'Přírodovědná literatura',
  'Astronomická literatura',
  'Filozofická literatura faktu',
  'Psychologická literatura faktu',
  'Sociologická literatura',
  'Politická literatura',
  'Ekonomická literatura',
  'Podnikatelská literatura',
  'Finanční literatura',
  'Zdravotnická literatura',
  'Medicínská literatura',
  'Výživová literatura',
  'Fitness literatura',
  'Kuchařky',
  'Zahradnické knihy',
  'Příručky',
  'Učebnice',
  'Slovníky',
  'Encyklopedie',
  'Atlasy',
  'Cestovní průvodce',
  'Jazykové učebnice',
  'Umělecká literatura',
  'Knihy o fotografii',
  'Hudební literatura',
  'Filmová literatura',
  'Komiksy',
  'Manga',
  'Manhwa',
  'Manhua',
  'Grafické romány',
  'Webtoony',
  'Light novel',
  'Vizuální novely',
  'Superhrdinské příběhy',
  'Westernové komiksy',
  'Autobiografické komiksy',
  'Erotická literatura',
  'Erotické povídky',
  'Erotické romány',
  'BDSM literatura',
  'LGBTQ+ literatura',
  'Queer literatura',
  'Feministická literatura',
  'Postkoloniální literatura',
  'Antiutopie',
  'Klimatická fikce',
  'Cli-fi',
  'Ekologická literatura',
  'Solarpunk',
  'Hopepunk',
  'Solarpunková fikce',
  'Vojenské romány',
  'Špionážní romány',
  'Soudní romány',
  'Lékařské romány',
  'Sportovní romány',
  'Hudební romány',
  'Umělecké romány',
  'Kulinářské romány',
  'Celebrity romance',
  'Královská romance',
  'Mafiánská romance',
  'Upírská romance',
  'Vlkodlačí romance',
  'Paranormální příběhy',
  'Příběhy o čarodějnicích',
  'Příběhy o upírech',
  'Příběhy o vlkodlacích',
  'Příběhy o andělech',
  'Příběhy o démonech',
  'Příběhy o vílách',
  'Příběhy o elfech',
  'Příběhy o dracích',
  'Mytologické romány',
  'Severská mytologie',
  'Řecká mytologie',
  'Egyptská mytologie',
  'Slovanská mytologie',
  'Artušovské legendy',
  'Retelling',
  'Pohádkový retelling',
  'Mytologický retelling',
  'Fanfiction',
  'Metafikce',
  'Interaktivní fikce',
  'Experimentální próza',
  'Krátké příběhy',
  'Antologie',
  'Povídkové sbírky',
  'Literární pastiš',
  'Fikce inspirovaná skutečností',
  'Alternativní realita',
  'Dystopická romance',
  'Fantasy detektivka',
  'Sci-fi detektivka',
  'Fantasy thriller',
  'Sci-fi thriller',
  'Mysteriózní romance',
  'Historický horor',
  'Komediální fantasy',
  'Filozofická sci-fi',
  'Sociální sci-fi',
  'Ekologická sci-fi',
  'Kosmická opera',
  'Space western',
  'Military sci-fi',
  'Military fantasy',
  'Akademická fantasy',
  'Dark academia',
  'Light academia',
  'Romantická komedie',
  'Černá komedie',
  'Tragikomedie',
  'Psychologické drama',
  'Politické drama',
  'Soudní drama',
  'Rodinná kronika',
  'Pikareskní román',
  'Pikareskní literatura',
  'Pikareskní dobrodružství',
  'Pikareskní satira',
  'Pikareskní komedie',
];

// Deduplicate preserving original order
export const GENRES_LIST = Array.from(new Set(RAW_GENRES));

/**
 * Detects the best matching genre for a book based on its properties.
 *
 * @param {Object} book
 * @returns {string} The detected genre string.
 */
export function detectGenre(book) {
  if (!book) return 'Román';
  if (book.genre && GENRES_LIST.includes(book.genre)) {
    return book.genre;
  }

  const searchText = [
    book.title,
    book.description,
    Array.isArray(book.subjects) ? book.subjects.join(' ') : book.subjects,
    Array.isArray(book.formats) ? book.formats.join(' ') : book.formats,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!searchText) return 'Román';

  // Sort genres by length descending so longer/more specific genres match first (e.g. "Epická fantasy" before "Fantasy")
  const sortedGenres = [...GENRES_LIST].sort((a, b) => b.length - a.length);

  for (const genre of sortedGenres) {
    const lowerGenre = genre.toLowerCase();
    // Check direct substring
    if (searchText.includes(lowerGenre)) {
      return genre;
    }
  }

  // Keyword heuristic fallbacks
  if (searchText.includes('detektiv') || searchText.includes('vražda') || searchText.includes('krimi')) {
    return 'Detektivka';
  }
  if (searchText.includes('fantasy') || searchText.includes('magie') || searchText.includes('kouzel')) {
    return 'Fantasy';
  }
  if (searchText.includes('sci-fi') || searchText.includes('scifi') || searchText.includes('vesmír')) {
    return 'Sci-fi';
  }
  if (searchText.includes('horor') || searchText.includes('strach')) {
    return 'Horor';
  }
  if (searchText.includes('thriller') || searchText.includes('napětí')) {
    return 'Thriller';
  }
  if (searchText.includes('román') || searchText.includes('příběh')) {
    return 'Román';
  }
  if (searchText.includes('pohádk')) {
    return 'Pohádka';
  }
  if (searchText.includes('básn') || searchText.includes('poezie')) {
    return 'Poezie';
  }
  if (searchText.includes('komik') || searchText.includes('manga')) {
    return 'Komiksy';
  }

  return 'Román';
}

/**
 * Groups an array of books by genre category.
 * IMPORTANT: Excludes any categories that contain 0 books.
 *
 * @param {Array<Object>} books
 * @returns {Array<{ genre: string, books: Array<Object> }>} Array of non-empty genre groups.
 */
export function groupBooksByGenre(books) {
  if (!Array.isArray(books) || books.length === 0) {
    return [];
  }

  const map = new Map();

  for (const book of books) {
    const genre = book.genre || detectGenre(book);
    if (!map.has(genre)) {
      map.set(genre, []);
    }
    map.get(genre).push(book);
  }

  const result = [];

  // 1. First add genres present in GENRES_LIST (in order)
  for (const genre of GENRES_LIST) {
    if (map.has(genre) && map.get(genre).length > 0) {
      result.push({
        genre,
        books: map.get(genre),
      });
      map.delete(genre);
    }
  }

  // 2. Add any remaining custom genres (if any) that have books
  for (const [genre, groupBooks] of map.entries()) {
    if (groupBooks.length > 0) {
      result.push({
        genre,
        books: groupBooks,
      });
    }
  }

  // Double-check: Filter strictly to categories with >0 books
  return result.filter((group) => group.books && group.books.length > 0);
}
