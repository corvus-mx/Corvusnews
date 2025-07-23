#!/usr/bin/env node

/**
 * Script rápido para crear noticias - Corvus News
 * Uso: node scripts/quick-news.js "Título" "Extracto" "Contenido"
 */

const fs = require('fs');
const path = require('path');
const NewsScanner = require('./news-scanner');

class QuickNews {
  constructor() {
    this.scanner = new NewsScanner();
  }

  async createNews(title, excerpt, content, options = {}) {
    console.log('🚀 Creando noticia rápida...');
    
    // Generar datos
    const newsData = {
      title: title.trim(),
      excerpt: excerpt.trim(),
      content: content.trim(),
      author: options.author || 'Corvus',
      category: options.category || 'investigacion',
      image: options.image || '📰',
      ...options
    };

    // Validar
    if (!newsData.title || !newsData.excerpt || !newsData.content) {
      throw new Error('Título, extracto y contenido son requeridos');
    }

    // Generar ID y fecha
    const date = new Date();
    const dateFolder = date.toISOString().split('T')[0];
    const id = this.generateId(newsData.title);
    
    newsData.id = id;
    newsData.date = date.toISOString();

    // Crear directorio
    const feedsDir = path.join(process.cwd(), 'feeds', dateFolder);
    if (!fs.existsSync(feedsDir)) {
      fs.mkdirSync(feedsDir, { recursive: true });
    }

    // Generar HTML
    const htmlContent = this.generateHTML(newsData, dateFolder);
    const htmlPath = path.join(feedsDir, `${id}.html`);
    
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');
    console.log(`📄 Archivo creado: ${htmlPath}`);

    // Actualizar JSON automáticamente
    await this.scanner.scanAndUpdate();
    
    console.log('✅ Noticia creada y sistema actualizado');
    return { id, path: htmlPath, date: dateFolder };
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

  generateHTML(newsData, dateFolder) {
    const date = new Date(newsData.date);
    const formattedDate = date.toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });

    const categoryLabels = {
      'corrupcion': 'Corrupción y Justicia',
      'soberania': 'Soberanía',
      'internacional': 'Internacional y Geopolítica',
      'economia': 'Economía',
      'tecnologia': 'Tecnología',
      'investigacion': 'Investigación'
    };

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
                    <span class="article-category">${categoryLabels[newsData.category] || 'Investigación'}</span>
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
    // Si ya tiene HTML, devolverlo tal como está
    if (content.includes('<p>') || content.includes('<div>')) {
      return content;
    }

    // Convertir texto plano a HTML
    return content
      .split('\n\n')
      .map(paragraph => paragraph.trim())
      .filter(paragraph => paragraph)
      .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
      .join('\n                    ');
  }
}

// CLI Usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log(`
🦉 CORVUS NEWS - Creador Rápido de Noticias

Uso: node scripts/quick-news.js "Título" "Extracto" "Contenido"

Ejemplo:
node scripts/quick-news.js \\
  "Nueva investigación sobre corrupción" \\
  "Revelamos documentos que muestran irregularidades en contratos públicos" \\
  "El análisis de documentos filtrados revela un patrón de irregularidades..."

Opciones adicionales (como cuarto parámetro JSON):
{
  "author": "Corvus",
  "category": "corrupcion",
  "image": "⚖️"
}
`);
    process.exit(1);
  }

  const [title, excerpt, content, optionsStr] = args;
  let options = {};
  
  if (optionsStr) {
    try {
      options = JSON.parse(optionsStr);
    } catch (e) {
      console.warn('⚠️  Opciones JSON inválidas, usando valores por defecto');
    }
  }

  const quickNews = new QuickNews();
  quickNews.createNews(title, excerpt, content, options)
    .catch(error => {
      console.error('❌ Error:', error.message);
      process.exit(1);
    });
}

module.exports = QuickNews;