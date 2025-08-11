#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

// Publication logos mapping
const publications = [
  // News & Current Affairs
  { name: 'BBC News', domain: 'bbc.com', filename: 'bbc.png' },
  { name: 'CNN', domain: 'cnn.com', filename: 'cnn.png' },
  { name: 'The Guardian', domain: 'theguardian.com', filename: 'guardian.png' },
  { name: 'Reuters', domain: 'reuters.com', filename: 'reuters.png' },
  { name: 'Associated Press', domain: 'apnews.com', filename: 'ap.png' },
  { name: 'The New York Times', domain: 'nytimes.com', filename: 'nytimes.png' },
  { name: 'The Washington Post', domain: 'washingtonpost.com', filename: 'washingtonpost.png' },
  
  // Business
  { name: 'Wall Street Journal', domain: 'wsj.com', filename: 'wsj.png' },
  { name: 'Financial Times', domain: 'ft.com', filename: 'ft.png' },
  { name: 'Bloomberg', domain: 'bloomberg.com', filename: 'bloomberg.png' },
  { name: 'Forbes', domain: 'forbes.com', filename: 'forbes.png' },
  { name: 'Fortune', domain: 'fortune.com', filename: 'fortune.png' },
  { name: 'Harvard Business Review', domain: 'hbr.org', filename: 'hbr.png' },
  { name: 'Fast Company', domain: 'fastcompany.com', filename: 'fastcompany.png' },
  { name: 'The Economist', domain: 'economist.com', filename: 'economist.png' },
  { name: 'Quartz', domain: 'qz.com', filename: 'quartz.png' },
  
  // Technology
  { name: 'TechCrunch', domain: 'techcrunch.com', filename: 'techcrunch.png' },
  { name: 'Wired', domain: 'wired.com', filename: 'wired.png' },
  { name: 'Ars Technica', domain: 'arstechnica.com', filename: 'arstechnica.png' },
  { name: 'The Verge', domain: 'theverge.com', filename: 'theverge.png' },
  { name: 'Engadget', domain: 'engadget.com', filename: 'engadget.png' },
  { name: 'MIT Technology Review', domain: 'technologyreview.com', filename: 'mit-tech-review.png' },
  
  // Science
  { name: 'Nature', domain: 'nature.com', filename: 'nature.png' },
  { name: 'Science Magazine', domain: 'science.org', filename: 'science.png' },
  { name: 'Scientific American', domain: 'scientificamerican.com', filename: 'scientific-american.png' },
  { name: 'New Scientist', domain: 'newscientist.com', filename: 'new-scientist.png' },
  { name: 'Smithsonian Magazine', domain: 'smithsonianmag.com', filename: 'smithsonian.png' },
  
  // Culture
  { name: 'The Atlantic', domain: 'theatlantic.com', filename: 'atlantic.png' },
  { name: 'The New Yorker', domain: 'newyorker.com', filename: 'new-yorker.png' },
  { name: 'Vox', domain: 'vox.com', filename: 'vox.png' },
  { name: 'Medium', domain: 'medium.com', filename: 'medium.png' },
  
  // International
  { name: 'Le Monde', domain: 'lemonde.fr', filename: 'lemonde.png' },
  { name: 'Der Spiegel', domain: 'spiegel.de', filename: 'spiegel.png' },
  { name: 'The Times of India', domain: 'indiatimes.com', filename: 'times-of-india.png' },
  { name: 'South China Morning Post', domain: 'scmp.com', filename: 'scmp.png' },
  { name: 'Al Jazeera', domain: 'aljazeera.com', filename: 'al-jazeera.png' },
  
  // Health
  { name: 'The Lancet', domain: 'thelancet.com', filename: 'lancet.png' },
  { name: 'NEJM', domain: 'nejm.org', filename: 'nejm.png' },
  { name: 'Mayo Clinic News', domain: 'mayoclinic.org', filename: 'mayo-clinic.png' },
  { name: 'WebMD', domain: 'webmd.com', filename: 'webmd.png' },
  
  // Environment
  { name: 'National Geographic', domain: 'nationalgeographic.com', filename: 'natgeo.png' },
  { name: 'Yale Environment 360', domain: 'yale.edu', filename: 'yale.png' },
  { name: 'Climate Central', domain: 'climatecentral.org', filename: 'climate-central.png' },
  
  // Education
  { name: 'Chronicle of Higher Education', domain: 'chronicle.com', filename: 'chronicle.png' },
  { name: 'Inside Higher Ed', domain: 'insidehighered.com', filename: 'inside-higher-ed.png' },
  
  // Entertainment
  { name: 'Variety', domain: 'variety.com', filename: 'variety.png' },
  { name: 'The Hollywood Reporter', domain: 'hollywoodreporter.com', filename: 'thr.png' },
  { name: 'Rolling Stone', domain: 'rollingstone.com', filename: 'rolling-stone.png' },
  
  // Sports
  { name: 'ESPN', domain: 'espn.com', filename: 'espn.png' },
  { name: 'Sports Illustrated', domain: 'si.com', filename: 'si.png' },
  
  // Politics
  { name: 'Politico', domain: 'politico.com', filename: 'politico.png' },
  { name: 'Foreign Affairs', domain: 'foreignaffairs.com', filename: 'foreign-affairs.png' }
];

const downloadLogo = (publication) => {
  return new Promise((resolve, reject) => {
    const url = `https://logo.clearbit.com/${publication.domain}`;
    const filepath = path.join(__dirname, '..', 'public', 'logos', publication.filename);
    
    console.log(`Downloading ${publication.name} from ${url}...`);
    
    const file = fs.createWriteStream(filepath);
    
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`✅ Downloaded: ${publication.filename}`);
          resolve(publication);
        });
      } else {
        console.log(`❌ Failed to download ${publication.name}: ${response.statusCode}`);
        file.close();
        fs.unlink(filepath, () => {}); // Delete the file
        resolve(publication); // Still resolve to continue with other downloads
      }
    }).on('error', (err) => {
      console.log(`❌ Error downloading ${publication.name}: ${err.message}`);
      file.close();
      fs.unlink(filepath, () => {}); // Delete the file
      resolve(publication); // Still resolve to continue with other downloads
    });
  });
};

const downloadAllLogos = async () => {
  console.log(`Starting download of ${publications.length} logos...`);
  
  // Download in batches to avoid overwhelming the server
  const batchSize = 5;
  for (let i = 0; i < publications.length; i += batchSize) {
    const batch = publications.slice(i, i + batchSize);
    await Promise.all(batch.map(downloadLogo));
    
    // Small delay between batches
    if (i + batchSize < publications.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('🎉 Logo download process completed!');
};

// Run the download
downloadAllLogos().catch(console.error);