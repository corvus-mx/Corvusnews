#!/usr/bin/env node

/**
 * Scanner automático de noticias - Corvus News
 * Escanea las carpetas de feeds y actualiza automáticamente el JSON
 * Uso: node scripts/news-scanner.js
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

class NewsScanner {
  constructor() {
    this.feedsDir = path.join(process.cwd(), 'feeds');
    this.newsDataPath = path.join(process.cwd(), 'js', 'news-data.js');
    this.categories = {
      'corrupcion': 'Corrupción y Justicia',
      'soberania': 'Soberanía',
      'internacional': 'Internacional y Geopolítica',
      'economia': 'Economía',
      'tecnologia': 'Tecnología',
      'investigacion': 'Investigación'
    };
  }

  async scanAndUpdate() {
    console.log('🔍 Escaneando noticias...');
    
    try {
      const allNews = await this.scanAllNews();
      await this.updateNewsData(allNews);
      console.log(`✅ Escaneadas y actualizadas ${allNews.length} noticias`);
      return allNews;
    } catch (error) {
      console.error('❌ Error:', error.message);
      throw error;
    }
  }

  async scanAllNews() {
    const allNews = [];
    
    if (!fs.existsSync(this.feedsDir)) {
      console.log('📁 Creando directorio feeds...');
      fs.mkdirSync(this.feedsDir, { recursive: true });
      return allNews;
    }

    const dateFolders = fs.readdirSync(this.feedsDir)
      .filter(folder => /^\d{4}-\d{2}-\d{2}$/.test(folder))
      .sort()
      .reverse(); // Más recientes primero

    for (const dateFolder of dateFolders) {
      const datePath = path.join(this.feedsDir, dateFolder);
      const htmlFiles = fs.readdirSync(datePath)
        .filter(file => file.endsWith('.html') && file !== 'index.html');

      for (const htmlFile of htmlFiles) {
        try {
          const newsData = await this.extractNewsFromHTML(datePath, htmlFile, dateFolder);
          if (newsData) {
            allNews.push(newsData);
          }
        } catch (error) {
          console.warn(`⚠️  Error procesando ${dateFolder}/${htmlFile}: ${error.message}`);
        }
      }
    }

    return allNews;
  }

  async extractNewsFromHTML(datePath, htmlFile, dateFolder) {
    const htmlPath = path.join(datePath, htmlFile);
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;

    // Extraer datos del HTML
    const title = document.querySelector('.article-title')?.textContent?.trim();
    const subtitle = document.querySelector('.article-subtitle')?.textContent?.trim();
    const category = document.querySelector('.article-category')?.textContent?.trim();
    const author = document.querySelector('.author-name')?.textContent?.trim() || 'Corvus';
    const content = document.querySelector('.article-body')?.innerHTML?.trim();

    if (!title || !subtitle || !content) {
      throw new Error('Faltan elementos requeridos en el HTML');
    }

    // Generar ID desde el nombre del archivo
    const id = path.basename(htmlFile, '.html');

    // Detectar categoría
    const categoryKey = this.detectCategory(category, content, title);

    // Generar fecha desde el folder o archivo
    const date = this.generateDate(dateFolder, htmlPath);

    // Extraer emoji/imagen del contenido o usar por defecto
    const image = this.extractEmoji(content, categoryKey);

    // Generar tags automáticamente
    const tags = this.generateTags(title, content, categoryKey);

    return {
      id,
      title,
      excerpt: subtitle,
      content,
      date,
      author,
      featured: true,
      tags,
      link: `../../feeds/${dateFolder}/${htmlFile}`,
      image,
      category: categoryKey,
      categoryLabel: this.categories[categoryKey] || category
    };
  }

  detectCategory(categoryText, content, title) {
    const text = `${categoryText} ${content} ${title}`.toLowerCase();
    
    // Palabras clave por categoría
    const keywords = {
      'corrupcion': ['corrupción', 'fraude', 'soborno', 'justicia', 'tribunal', 'fiscal', 'delito'],
      'soberania': ['soberanía', 'autonomía', 'independencia', 'nacional', 'fideicomiso', 'banco'],
      'internacional': ['internacional', 'geopolítica', 'comercio', 'aranceles', 'tratado', 'global'],
      'economia': ['economía', 'económico', 'financiero', 'mercado', 'inversión', 'pesos'],
      'tecnologia': ['tecnología', 'digital', 'ciberseguridad', 'internet', 'datos', 'privacidad'],
      'investigacion': ['investigación', 'reportaje', 'denuncia', 'evidencia', 'fuentes']
    };

    let maxScore = 0;
    let detectedCategory = 'investigacion';

    for (const [category, words] of Object.entries(keywords)) {
      const score = words.reduce((acc, word) => {
        const matches = (text.match(new RegExp(word, 'g')) || []).length;
        return acc + matches;
      }, 0);

      if (score > maxScore) {
        maxScore = score;
        detectedCategory = category;
      }
    }

    return detectedCategory;
  }

  generateDate(dateFolder, htmlPath) {
    // Intentar usar la fecha del folder
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateFolder)) {
      return new Date(dateFolder + 'T12:00:00Z').toISOString();
    }

    // Usar fecha de modificación del archivo
    const stats = fs.statSync(htmlPath);
    return stats.mtime.toISOString();
  }

  extractEmoji(content, category) {
    // Buscar emojis en el contenido
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    const emojis = content.match(emojiRegex);
    
    if (emojis && emojis.length > 0) {
      return emojis[0];
    }

    // Emojis por defecto por categoría
    const defaultEmojis = {
      'corrupcion': '⚖️',
      'soberania': '🛡️',
      'internacional': '🌎',
      'economia': '💰',
      'tecnologia': '💻',
      'investigacion': '🔍'
    };

    return defaultEmojis[category] || '📰';
  }

  generateTags(title, content, category) {
    const text = `${title} ${content}`.toLowerCase();
    const commonWords = ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'los', 'las', 'una', 'como', 'pero', 'sus', 'han', 'fue', 'ser', 'está', 'más', 'muy', 'todo', 'ya', 'sobre', 'esta', 'hasta', 'hay', 'donde', 'quien', 'desde', 'todos', 'durante', 'sin', 'entre', 'cuando', 'él', 'ella', 'tanto', 'también', 'solo', 'antes', 'ahora', 'cada', 'aquí', 'después', 'otros', 'otro', 'nueva', 'nuevo', 'gran', 'mismo', 'mejor', 'algún', 'alguna', 'algunos', 'algunas'];
    
    // Extraer palabras relevantes
    const words = text
      .replace(/[^\w\sáéíóúñü]/gi, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word))
      .reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
      }, {});

    // Obtener las 5 palabras más frecuentes
    const topWords = Object.entries(words)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);

    // Agregar categoría como tag
    const categoryTags = {
      'corrupcion': 'corrupción',
      'soberania': 'soberanía',
      'internacional': 'internacional',
      'economia': 'economía',
      'tecnologia': 'tecnología',
      'investigacion': 'investigación'
    };

    const tags = [categoryTags[category], ...topWords].filter(Boolean);
    return [...new Set(tags)]; // Remover duplicados
  }

  async updateNewsData(allNews) {
    const jsContent = `// Base de datos de noticias - Corvus MexiLeaks
// Todas las noticias del sitio organizadas por fecha
// Generado automáticamente - ${new Date().toISOString()}

const newsDatabase = ${JSON.stringify(allNews, null, 2)};

// Funciones utilitarias para manejo de noticias
const NewsManager = {
  getAllNews: function() {
    return newsDatabase.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  getLatestNews: function() {
    const sortedNews = this.getAllNews();
    return sortedNews.length > 0 ? sortedNews[0] : null;
  },

  getFeaturedNews: function() {
    return newsDatabase
      .filter(news => news.featured)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  formatDate: function(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Mexico_City' };
    return date.toLocaleDateString('es-MX', options);
  },

  formatDateTime: function(dateString) {
    const date = new Date(dateString);
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' };
    return date.toLocaleDateString('es-MX', options);
  },

  getCategoryColor: function() {
    return '#666666';
  },

  getStats: function() {
    const total = newsDatabase.length;
    return {
      total,
      lastUpdate: this.getLatestNews()?.date
    };
  }
};

if (typeof window !== 'undefined') {
  window.NewsManager = NewsManager;
  window.newsDatabase = newsDatabase;
}
`;

    fs.writeFileSync(this.newsDataPath, jsContent, 'utf8');
    console.log('📊 news-data.js actualizado');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const scanner = new NewsScanner();
  scanner.scanAndUpdate().catch(console.error);
}

module.exports = NewsScanner;