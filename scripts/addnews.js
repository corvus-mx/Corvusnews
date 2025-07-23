#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const minimist = require('minimist');

class SimpleNewsAdder {
  constructor() {
    this.categories = {
      'corrupcion': 'Corrupción y Justicia',
      'soberania': 'Soberanía',
      'internacional': 'Internacional y Geopolítica',
      'economia': 'Economía',
      'tecnologia': 'Tecnología',
      'investigacion': 'Investigación'
    };
  }

  async promptInput(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    }));
  }

  async addNewsInteractive() {
    console.log('📰 Agregando nueva noticia\n');
    const title = await this.promptInput('Título: ');
    const excerpt = await this.promptInput('Extracto: ');
    const content = await this.promptInput('Contenido (usa \\n para párrafos): ');

    let category;
    while (true) {
      category = await this.promptInput('¿Categoría? (corrupcion, soberania, internacional, economia, tecnologia, investigacion): ');
      if (this.categories[category]) break;
      console.log('❌ Categoría no válida. Intenta de nuevo.');
    }

    const imageUrl = await this.promptInput('¿URL de imagen? (opcional): ');
    const imageCaption = await this.promptInput('¿Pie de imagen? (opcional): ');

    return this.addNews(title, excerpt, content.replace(/\\n/g, '\n'), {
      category,
      imageUrl,
      imageCaption
    });
  }

  async addNews(title, excerpt, content, options = {}) {
    console.log('📰 Agregando noticia...');

    const date = new Date();
    const dateFolder = date.toISOString().split('T')[0];
    const id = this.generateId(title);

    const newsData = {
      id,
      title: title.trim(),
      excerpt: excerpt.trim(),
      content: content.trim(),
      date: date.toISOString(),
      author: options.author || 'Corvus',
      category: options.category || this.detectCategory(title + ' ' + content),
      image: options.image || this.getDefaultEmoji(options.category),
      tags: options.tags || this.generateTags(title, content),
      featured: options.featured !== false,
      imageUrl: options.imageUrl || '',
      imageCaption: options.imageCaption || ''
    };

    const feedsDir = path.join(process.cwd(), 'feeds', dateFolder);
    if (!fs.existsSync(feedsDir)) {
      fs.mkdirSync(feedsDir, { recursive: true });
    }

    const htmlPath = path.join(feedsDir, `${id}.html`);
    const htmlContent = this.generateHTML(newsData);

    if (!fs.existsSync(htmlPath)) {
      fs.writeFileSync(htmlPath, htmlContent, 'utf8');
      console.log(`✅ Archivo creado: feeds/${dateFolder}/${id}.html`);
    } else {
      console.log(`⚠️ Ya existe el archivo HTML, no se sobrescribió.`);
    }

    this.updateNewsData(newsData);
    return { id, dateFolder, path: htmlPath };
  }

  generateId(title) {
    return title
      .toLowerCase()
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-')
      .substring(0, 50);
  }

  detectCategory(text) {
    const content = text.toLowerCase();
    const keywords = {
      'corrupcion': ['corrupción', 'fraude', 'soborno', 'justicia', 'tribunal'],
      'soberania': ['soberanía', 'autonomía', 'independencia', 'fideicomiso'],
      'internacional': ['internacional', 'geopolítica', 'comercio', 'aranceles'],
      'economia': ['economía', 'económico', 'financiero', 'mercado'],
      'tecnologia': ['tecnología', 'digital', 'ciberseguridad', 'internet']
    };

    for (const [category, words] of Object.entries(keywords)) {
      if (words.some(word => content.includes(word))) {
        return category;
      }
    }
    return 'investigacion';
  }

  getDefaultEmoji(category) {
    const emojis = {
      'corrupcion': '⚖️',
      'soberania': '🛡️',
      'internacional': '🌎',
      'economia': '💰',
      'tecnologia': '💻',
      'investigacion': '🔍'
    };
    return emojis[category] || '📰';
  }

  generateTags(title, content) {
    const text = `${title} ${content}`.toLowerCase();
    const commonWords = [...new Set(['el','la','de','que','y','en','un','es','se','no','te','lo','le','da','su','por','son','con','para','al','del','los','las','una','como','pero','sus','han','fue','ser','está','más','muy','todo','ya','sobre','esta','hasta','hay','donde','quien','desde','todos','durante','sin','entre','cuando'])];

    const words = text
      .replace(/[^\w\sáéíóúñü]/gi, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word))
      .reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {});

    return Object.entries(words)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([word]) => word);
  }

  generateHTML(newsData) {
    const date = new Date(newsData.date);
    const formattedDate = date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const imageHtml = newsData.imageUrl
      ? `<img src="${newsData.imageUrl}" alt="Imagen relacionada" class="caricatura-img">` +
        (newsData.imageCaption ? `<div class="caricatura-caption">${newsData.imageCaption}</div>` : '')
      : '';

    const template = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

    return template
      .replace(/<title>TÍTULO_DE_LA_NOTICIA<\/title>/, `<title>${newsData.title}</title>`)
      .replace(/<h1 class="article-title">.*?<\/h1>/, `<h1 class="article-title">${newsData.title}</h1>`)
      .replace(/<span class="article-category">.*?<\/span>/, `<span class="article-category">${this.categories[newsData.category] || 'Investigación'}</span>`)
      .replace(/<span>FECHA<\/span>/, `<span>${formattedDate}</span>`)
      .replace(/<p class="article-subtitle">[\s\S]*?<\/p>/, `<p class="article-subtitle">${newsData.excerpt}</p>`)
      .replace(/<!-- CONTENIDO_PRINCIPAL_DE_LA_NOTICIA -->/, this.formatContent(newsData.content))
      .replace(/<!-- MAS_CONTENIDO_EXTRA -->/, imageHtml)
      .replace(/<h3 class="author-name">.*?<\/h3>/, `<h3 class="author-name">${newsData.author}</h3>`);
  }

  formatContent(content) {
    if (content.includes('<p>') || content.includes('<div>')) return content;
    return content
      .split('\n\n')
      .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('\n                    ');
  }

  updateNewsData(newsData) {
    const newsDataPath = path.join(process.cwd(), 'js', 'news-data.js');
    let existingNews = [];

    if (fs.existsSync(newsDataPath)) {
      try {
        const content = fs.readFileSync(newsDataPath, 'utf8');
        const start = content.indexOf('const newsDatabase = [');
        const end = content.indexOf('];', start);
        if (start !== -1 && end !== -1) {
          const arrayText = content.substring(start + 'const newsDatabase = '.length, end + 1);
          existingNews = eval(arrayText);
        }
      } catch (err) {
        console.error('❌ Error al procesar news-data.js:', err.message);
      }
    }

    const exists = existingNews.some(n =>
      n.id === newsData.id || n.title.toLowerCase() === newsData.title.toLowerCase()
    );
    if (exists) {
      console.log('🚫 Noticia ya registrada. No se agregó.');
      return;
    }

    const dateFolder = newsData.date.split('T')[0];
    existingNews.unshift({
      id: newsData.id,
      title: newsData.title,
      excerpt: newsData.excerpt,
      content: newsData.content,
      date: newsData.date,
      author: newsData.author,
      featured: newsData.featured,
      tags: newsData.tags,
      link: `../../feeds/${dateFolder}/${newsData.id}.html`,
      image: newsData.image
    });

    const content = fs.readFileSync(newsDataPath, 'utf8');
    const splitMarker = '// Funciones utilitarias para manejo de noticias';
    const restOfContent = content.includes(splitMarker)
      ? content.substring(content.indexOf(splitMarker))
      : '';

    const newDataContent = `// Base de datos de noticias - Corvus MexiLeaks
// Todas las noticias del sitio organizadas por fecha

const newsDatabase = ${JSON.stringify(existingNews, null, 2)};

${restOfContent}`;

    fs.writeFileSync(newsDataPath, newDataContent, 'utf8');
    console.log('✅ news-data.js actualizado correctamente');
  }
}

if (require.main === module) {
  const argv = minimist(process.argv.slice(2));
  const [title, excerpt, content] = argv._;

  const adder = new SimpleNewsAdder();

  if (!title || !excerpt || !content) {
    adder.addNewsInteractive();
  } else {
    adder.addNews(title, excerpt, content, {
      category: argv.category,
      imageUrl: argv.imageUrl,
      imageCaption: argv.imageCaption
    });
  }
}

module.exports = SimpleNewsAdder;
