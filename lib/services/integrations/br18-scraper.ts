import * as cheerio from 'cheerio';

export interface BR18Document {
  text: string;
  metadata: {
    'br-page-title': string;
    'br-page-url': string;
    'br-paragraph': string;
    'br-href': string;
    'br-paragraph-title': string;
    'source': string;
    'status': string;
  };
}

export class BR18Scraper {
  
  async scrapeBR18Page(pageNum: number): Promise<BR18Document[]> {
    const url = `https://www.bygningsreglementet.dk/Tekniske-bestemmelser/${pageNum.toString().padStart(2, '0')}/Krav?Layout=ShowAll`;
    
    try {
      console.log(`🔍 Scraping BR18 page ${pageNum} from: ${url}`);
      
      // Fetch the page with proper headers to avoid being blocked
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch BR18: HTTP ${response.status}`);
      }
      const html = await response.text();
      const $ = cheerio.load(html);

      // Find the page title
      const titleSection = $('section.section-module.section-module--tabs');
      if (titleSection.length === 0) {
        throw new Error('Failed to find page title section');
      }
      
      const pageTitle = titleSection.find('h1').first().text();
      if (!pageTitle) {
        throw new Error('Failed to find page title');
      }


      // Find all sections
      const mainContent = $('body main');
      if (mainContent.length === 0) {
        throw new Error('Failed to find main content');
      }

      const sections = mainContent.find('section.anchor-reference');

      const documents: BR18Document[] = [];

      sections.each((_index: number, sectionElement: any) => {
        try {
          const section = $(sectionElement);
          // Get the paragraph link and href
          const pLink = section.find('div div a').first();
          if (pLink.length === 0) return;
          const pHref = pLink.attr('href');
          if (!pHref) return;
          const pRange = pLink.find('div.accordion__tag').first().text();
          // Find the accordion content
          const pDivs = section.find('div.accordion__content').first();
          if (pDivs.length === 0) return;

          const pTitle = pLink.find('h2.accordion__title').first().text();
          if (!pTitle) {
              return;
            }
          
          // Find all text divs within this section
          const textDivs = pDivs.find('div.accordion__row.accordion__row--text');
          console.log('scraping section', pTitle);
          textDivs.each((_textIndex: number, textDivElement: any) => {
            try {
              const textDiv = $(textDivElement);
              
              // Get paragraph identifier
              // This is the paragraph number if not there we are not in the range therefore range is just a single paragraph
              const pDiv = textDiv.find('div').first();
              const p = pDiv.length > 0 ? pDiv.text() : pRange;
              
              // Get content div
              const contentDiv = textDiv.find('div.accordion__content').first();
              if (contentDiv.length === 0) return;
              
              const pContent = contentDiv.text().trim();
              
              // Skip repealed sections
              if (pContent === '(Ophævet)' || pContent.includes('Ophævet')) {
                console.log('Skipping repealed section');
                return;
              }
              
              // Skip empty content
              if (!pContent) {
                console.log('Skipping empty section');
                return;
              }
              
              const document: BR18Document = {
                text: pContent,
                metadata: {
                  'br-page-title': pageTitle,
                  'br-page-url': url,
                  'br-paragraph': p,
                  'br-paragraph-title': pTitle,
                  'br-href': pHref,
                  'source': 'BR18',
                  'status': 'active'
                }
              };
              console.log(document);
              documents.push(document);
              
            } catch (sectionError) {
              console.warn(`⚠️ Error processing section in page ${pageNum}:`, sectionError);
            }
          });
          
        } catch (sectionError) {
          console.warn(`⚠️ Error processing section in page ${pageNum}:`, sectionError);
        }
      });

      console.log(`✅ Successfully scraped ${documents.length} documents from BR18 page ${pageNum}`);
      return documents;
      
    } catch (error) {
      console.error(`❌ Error fetching BR18 page ${pageNum}:`, error);
      return [];
    }
  }

  // Test method to scrape just one page for validation
  async testScrape(pageNum: number = 5): Promise<void> {
    console.log(`🧪 Testing BR18 scraper with page ${pageNum}...`);
    const documents = await this.scrapeBR18Page(pageNum);
    
    console.log(`📊 Test Results:`);
    console.log(`- Documents found: ${documents.length}`);
    
    if (documents.length > 0) {
      console.log(`- Sample document:`);
      console.log(`  Title: ${documents[0].metadata['br-page-title']}`);
      console.log(`  Paragraph: ${documents[0].metadata['br-paragraph']}`);
      console.log(`  Text preview: ${documents[0].text.substring(0, 100)}...`);
    }
  }
}

export const br18Scraper = new BR18Scraper(); 