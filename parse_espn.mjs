import fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('/tmp/espn_full.html', 'utf8');
const $ = cheerio.load(html);

console.log("=== Searching for Premier League section ===\n");

// Find all tables
let found = false;
$('div').each((i, section) => {
  const sectionText = $(section).text();
  
  if (sectionText.includes('English Premier League')) {
    console.log("✓ Found Premier League section!");
    
    // Find table in this section
    const table = $(section).find('table').first();
    
    if (table.length > 0) {
      console.log("✓ Found table!");
      
      // Find Arsenal row
      table.find('tr').each((j, row) => {
        const rowText = $(row).text();
        
        if (rowText.includes('Arsenal') || rowText.includes('Sunderland')) {
          console.log("\n=== Arsenal/Sunderland Row Found ===");
          console.log("Full row text:", rowText);
          
          const cells = $(row).find('td');
          console.log(`\nNumber of <td> cells: ${cells.length}`);
          
          cells.each((k, cell) => {
            const cellText = $(cell).text().trim();
            const cellHtml = $(cell).html();
            console.log(`Cell ${k}: "${cellText}"`);
            if (cellHtml && cellHtml.length < 200) {
              console.log(`  HTML: ${cellHtml}`);
            }
          });
          
          found = true;
        }
      });
    }
  }
});

if (!found) {
  console.log("\n❌ Arsenal match not found in Premier League section");
}
