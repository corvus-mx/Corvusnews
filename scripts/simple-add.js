#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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
      featured: options.featured !== false
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
    const commonWords = ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'los', 'las', 'una', 'como', 'pero', 'sus', 'han', 'fue', 'ser', 'está', 'más', 'muy', 'todo', 'ya', 'sobre', 'esta', 'hasta', 'hay', 'donde', 'quien', 'desde', 'todos', 'durante', 'sin', 'entre', 'cuando'];

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

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${newsData.title}</title>
  <link rel="stylesheet" href="../../../assets/style.css">
</head>
<body>
  <main>
    <h1>${newsData.title}</h1>
    <p><strong>${newsData.excerpt}</strong></p>
    <p><em>${formattedDate}</em></p>
    <div>${this.formatContent(newsData.content)}</div>
  </main>
</body>
</html>`;
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
        } else {
          console.warn('⚠️ No se pudo localizar el array de noticias.');
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
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.log(`Uso: node scripts/simple-add.js "Título" "Extracto" "Contenido"`);
    process.exit(1);
  }
  const [title, excerpt, content] = args;
  const adder = new SimpleNewsAdder();
  adder.addNews(title, excerpt, content)
    .then(() => {
      console.log('\n🎉 ¡Listo! Ejecuta:\ngit add .\ngit commit -m "Nueva noticia"\ngit push');
    })
    .catch(error => {
      console.error('❌ Error:', error.message);
      process.exit(1);
    });
}

module.exports = SimpleNewsAdder;
