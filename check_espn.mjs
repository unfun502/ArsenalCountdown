import fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('/tmp/espn_feb.html', 'utf8');
const $ = cheerio.load(html);

console.log("=== Checking ESPN for Feb 3, 2026 ===\n");

let found = false;
$('div').each((i, section) => {
  const sectionText = $(section).text();
  
  // Look for EFL Cup or League Cup or Arsenal
  if ((sectionText.includes('EFL Cup') || sectionText.includes('League Cup') || sectionText.includes('Carabao')) && sectionText.includes('Arsenal')) {
    console.log("✓ Found EFL Cup/League Cup section with Arsenal!");
    
    const table = $(section).find('table').first();
    
    if (table.length > 0) {
      table.find('tr').each((j, row) => {
        const rowText = $(row).text();
        
        if (rowText.includes('Arsenal') && rowText.includes('Chelsea')) {
          console.log("\n=== Arsenal vs Chelsea Row ===");
          console.log("Row text:", rowText.substring(0, 200));
          
          const cells = $(row).find('td');
          console.log(`\nNumber of cells: ${cells.length}`);
          
          cells.each((k, cell) => {
            console.log(`Cell ${k}: "${$(cell).text().trim().substring(0, 50)}"`);
          });
          
          found = true;
          return false;
        }
      });
    }
    if (found) return false;
  }
});

if (!found) {
  console.log("❌ Arsenal vs Chelsea match not found");
  console.log("\nSearching for any Arsenal mention...");
  
  $('tr').each((i, row) => {
    const text = $(row).text();
    if (text.includes('Arsenal')) {
      console.log(`Found: ${text.substring(0, 150)}...`);
    }
  });
}
