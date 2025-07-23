#!/usr/bin/env node

/**
 * Script para crear noticias de manera rápida desde línea de comandos
 * Uso: node scripts/create-news.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

class NewsCreator {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.categories = {
      '1': { key: 'corrupcion', label: 'Corrupción y Justicia' },
      '2': { key: 'soberania', label: 'Soberanía' },
      '3': { key: 'internacional', label: 'Internacional y Geopolítica' },
      '4': { key: 'economia', label: 'Economía' },
      '5': { key: 'tecnologia', label: 'Tecnología' },
      '6': { key: 'investigacion', label: 'Investigación' }
    };
  }

  async createNews() {
    console.log('\n🦉 CORVUS NEWS - Creador de Noticias\n');
    console.log('='.repeat(50));
    
    try {
      const newsData = await this.collectNewsData();
      const confirmation = await this.confirmCreation(newsData);
      
      if (confirmation) {
        await this.generateFiles(newsData);
        console.log('\n✅ Noticia creada exitosamente!');
      } else {
        console.log('\n❌ Creación cancelada.');
      }
    } catch (error) {
      console.error('\n❌ Error:', error.message);
    } finally {
      this.rl.close();
    }
  }

  async collectNewsData() {
    const newsData = {};
    
    // Título
    newsData.title = await this.question('📝 Título de la noticia: ');
    if (!newsData.title.trim()) throw new Error('El título es requerido');
    
    // Generar ID automáticamente
    newsData.id = this.generateId(newsData.title);
    console.log(`🔗 ID generado: ${newsData.id}`);
    
    // Categoría
    console.log('\n📂 Selecciona una categoría:');
    Object.entries(this.categories).forEach(([num, cat]) => {
      console.log(`  ${num}. ${cat.label}`);
    });
    
    const categoryNum = await this.question('Número de categoría (1-6): ');
    const selectedCategory = this.categories[categoryNum];
    if (!selectedCategory) throw new Error('Categoría inválida');
    
    newsData.category = selectedCategory.key;
    newsData.categoryLabel = selectedCategory.label;
    
    // Extracto
    newsData.excerpt = await this.question('📄 Extracto/Subtítulo: ');
    if (!newsData.excerpt.trim()) throw new Error('El extracto es requerido');
    
    // Autor
    newsData.author = await this.question('👤 Autor (Corvus): ') || 'Corvus';
    
    // Emoji/Icono
    newsData.image = await this.question('🎨 Emoji/Icono (📰): ') || '📰';
    
    // Tags
    const tagsInput = await this.question('🏷️  Tags (separados por comas): ');
    newsData.tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    
    // Contenido
    console.log('\n📝 Contenido de la noticia:');
    console.log('   (Escribe el contenido línea por línea. Escribe "END" en una línea vacía para terminar)');
    
    const contentLines = [];
    while (true) {
      const line = await this.question('> ');
      if (line.trim() === 'END') break;
      contentLines.push(line);
    }
    
    newsData.content = contentLines.join('\n');
    if (!newsData.content.trim()) throw new Error('El contenido es requerido');
    
    // Estado
    const publishNow = await this.question('📢 ¿Publicar ahora? (s/N): ');
    newsData.featured = publishNow.toLowerCase().startsWith('s');
    
    // Fecha
    newsData.date = new Date().toISOString();
    
    return newsData;
  }

  generateId(title) {
    const date = new Date();
    const year = date.getFullYear();
    
    const slug = title
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
      .substring(0, 30);

    return `${year}-${slug}`;
  }

  async confirmCreation(newsData) {
    console.log('\n📋 RESUMEN DE LA NOTICIA:');
    console.log('='.repeat(30));
    console.log(`Título: ${newsData.title}`);
    console.log(`ID: ${newsData.id}`);
    console.log(`Categoría: ${newsData.categoryLabel}`);
    console.log(`Autor: ${newsData.author}`);
    console.log(`Estado: ${newsData.featured ? 'Publicado' : 'Borrador'}`);
    console.log(`Tags: ${newsData.tags.join(', ') || 'Ninguno'}`);
    console.log(`Extracto: ${newsData.excerpt.substring(0, 100)}...`);
    console.log('='.repeat(30));
    
    const confirm = await this.question('\n✅ ¿Crear esta noticia? (S/n): ');
    return !confirm.toLowerCase().startsWith('n');
  }

  async generateFiles(newsData) {
    const date = new Date(newsData.date);
    const dateFolder = date.toISOString().split('T')[0];
    
    // Crear directorio si no existe
    const feedsDir = path.join(process.cwd(), 'feeds', dateFolder);
    if (!fs.existsSync(feedsDir)) {
      fs.mkdirSync(feedsDir, { recursive: true });
      console.log(`📁 Directorio creado: ${feedsDir}`);
    }
    
    // Generar archivo HTML
    const htmlContent = this.generateHTML(newsData, dateFolder);
    const htmlPath = path.join(feedsDir, `${newsData.id}.html`);
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    console.log(`📄 Archivo HTML creado: ${htmlPath}`);
    
    // Actualizar news-data.js
    await this.updateNewsData(newsData);
    
    // Crear archivo JSON para backup
    const jsonPath = path.join(feedsDir, `${newsData.id}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(newsData, null, 2), 'utf8');
    console.log(`💾 Backup JSON creado: ${jsonPath}`);
  }

  generateHTML(newsData, dateFolder) {
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${newsData.title}</title>
    <link rel="stylesheet" href="../../../assets/style.css">
    <style>
        .caricatura-img {
            display: block;
            margin: 2rem auto;
            max-width: 480px;
            width: 100%;
            border-radius: 0.8rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.12);
            border: 1px solid #e0e0e0;
            background: #fafafa;
        }
        .caricatura-caption {
            text-align: center;
            color: #888;
            font-size: 0.98rem;
            margin-top: 0.3rem;
            margin-bottom: 1.7rem;
        }
        @media (max-width: 600px) {
            .caricatura-img {
                max-width: 98vw;
            }
        }
    </style>
</head>
<body>
    <nav class="topbar">
        <div class="topbar-container">
            <a href="../../index.html" class="topbar-brand">
                <span class="brand-text">Corvus News</span>
            </a>
            <div class="nav-desktop">
                <a href="./" class="nav-link">Noticias</a>
                <a href="../../guia.html" class="nav-link">Guía Segura</a>
                <a href="../../mirrors.html" class="nav-link">Mirrors</a>
                <a href="../../contacto.html" class="nav-cta">Contacto</a>
            </div>
            <button class="menu-toggle" onclick="toggleMobileMenu()" aria-label="Abrir menú">
                <span id="menu-icon">☰</span>
            </button>
        </div>
        <div class="nav-mobile" id="nav-mobile">
            <a href="./" class="nav-link">Noticias</a>
            <a href="../../guia.html" class="nav-link">Guía Segura</a>
            <a href="../../mirrors.html" class="nav-link">Mirrors</a>
            <a href="../../contacto.html" class="nav-cta">Contacto</a>
        </div>
    </nav>
    <br/><br/><br/>
    <main>
        <section class="article-page-container">
            <aside class="article-author-sidebar">
                <div class="author-avatar">
                    <span class="story-placeholder">👤</span>
                </div>
                <h3 class="author-name">${newsData.author}</h3>
                <p class="author-role">Periodista de Investigación Independiente</p>
                <p class="author-bio">
                    ${newsData.author} se dedica a desenterrar la verdad oculta detrás de los titulares, especializándose en corrupción, abusos de poder y los impactos de la tecnología en la sociedad mexicana. Su trabajo busca arrojar luz sobre las sombras, empoderando a los ciudadanos con información crítica.
                </p>
            </aside>

            <article class="article-content">
                <div class="article-meta">
                    <span class="article-category">${newsData.categoryLabel}</span>
                    <span>${formattedDate}</span>
                </div>
                <h1 class="article-title">${newsData.title}</h1>
                <p class="article-subtitle">
                    ${newsData.excerpt}
                </p>

                <div class="article-body">
                    ${this.formatContent(newsData.content)}
                </div>
            </article>
        </section>
    </main>
    <footer>
        <div class="footer-content">
            <!-- Footer content -->
        </div>
        <div class="footer-bottom">
            <p>&copy; 2025 Corvus News. Todos los derechos reservados. Desarrollado con transparencia.</p>
        </div>
    </footer>
    <script>
        function toggleMobileMenu() {
            const mobileNav = document.getElementById('nav-mobile');
            const menuIcon = document.getElementById('menu-icon');
            
            mobileNav.classList.toggle('show');
            menuIcon.textContent = mobileNav.classList.contains('show') ? '✕' : '☰';
        }

        // Close mobile menu when clicking outside
        document.addEventListener('click', function(event) {
            const mobileNav = document.getElementById('nav-mobile');
            const menuToggle = document.querySelector('.menu-toggle');
            
            if (!mobileNav.contains(event.target) && !menuToggle.contains(event.target)) {
                mobileNav.classList.remove('show');
                document.getElementById('menu-icon').textContent = '☰';
            }
        });
    </script>
</body>
</html>`;
  }

  formatContent(content) {
    // Convertir saltos de línea a párrafos HTML
    return content
      .split('\n\n')
      .map(paragraph => paragraph.trim())
      .filter(paragraph => paragraph)
      .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
      .join('\n                    ');
  }

  async updateNewsData(newsData) {
    const newsDataPath = path.join(process.cwd(), 'js', 'news-data.js');
    
    // Leer archivo existente
    let existingNews = [];
    if (fs.existsSync(newsDataPath)) {
      const content = fs.readFileSync(newsDataPath, 'utf8');
      const match = content.match(/const newsDatabase = (\[[\s\S]*?\]);/);
      if (match) {
        try {
          existingNews = JSON.parse(match[1]);
        } catch (e) {
          console.warn('⚠️  No se pudo parsear el archivo existente, creando uno nuevo');
        }
      }
    }
    
    // Agregar nueva noticia
    const date = new Date(newsData.date);
    const dateFolder = date.toISOString().split('T')[0];
    
    const newsEntry = {
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
    };
    
    existingNews.unshift(newsEntry);
    
    // Generar nuevo contenido del archivo
    const newContent = `// Base de datos de noticias - Corvus MexiLeaks
// Todas las noticias del sitio organizadas por fecha

const newsDatabase = ${JSON.stringify(existingNews, null, 2)};


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
    
    fs.writeFileSync(newsDataPath, newContent, 'utf8');
    console.log(`📊 Archivo news-data.js actualizado`);
  }

  question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const creator = new NewsCreator();
  creator.createNews();
}

module.exports = NewsCreator;