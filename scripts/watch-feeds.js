#!/usr/bin/env node

/**
 * Watcher automático para feeds - Corvus News
 * Monitorea cambios en la carpeta feeds y actualiza automáticamente
 * Uso: node scripts/watch-feeds.js
 */

const fs = require('fs');
const path = require('path');
const NewsScanner = require('./news-scanner');

class FeedsWatcher {
  constructor() {
    this.scanner = new NewsScanner();
    this.feedsDir = path.join(process.cwd(), 'feeds');
    this.isProcessing = false;
    this.debounceTimer = null;
  }

  start() {
    console.log('👁️  Iniciando watcher de feeds...');
    console.log(`📁 Monitoreando: ${this.feedsDir}`);
    
    // Crear directorio si no existe
    if (!fs.existsSync(this.feedsDir)) {
      fs.mkdirSync(this.feedsDir, { recursive: true });
      console.log('📁 Directorio feeds creado');
    }

    // Escaneo inicial
    this.processChanges();

    // Configurar watcher
    const watcher = fs.watch(this.feedsDir, { recursive: true }, (eventType, filename) => {
      if (filename && filename.endsWith('.html') && filename !== 'index.html') {
        console.log(`📝 Detectado cambio: ${eventType} - ${filename}`);
        this.debounceProcess();
      }
    });

    console.log('✅ Watcher iniciado. Presiona Ctrl+C para detener.');
    
    // Manejar cierre graceful
    process.on('SIGINT', () => {
      console.log('\n🛑 Deteniendo watcher...');
      watcher.close();
      process.exit(0);
    });

    // Mantener el proceso vivo
    setInterval(() => {
      // Heartbeat cada 30 segundos
      console.log(`💓 Watcher activo - ${new Date().toLocaleTimeString()}`);
    }, 30000);
  }

  debounceProcess() {
    // Evitar múltiples procesamientos simultáneos
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.processChanges();
    }, 1000); // Esperar 1 segundo después del último cambio
  }

  async processChanges() {
    if (this.isProcessing) {
      console.log('⏳ Ya hay un procesamiento en curso, esperando...');
      return;
    }

    this.isProcessing = true;
    
    try {
      console.log('🔄 Procesando cambios...');
      const allNews = await this.scanner.scanAndUpdate();
      console.log(`✅ Actualización completada - ${allNews.length} noticias procesadas`);
      
      // Generar índices automáticamente
      await this.generateIndexes();
      
    } catch (error) {
      console.error('❌ Error procesando cambios:', error.message);
    } finally {
      this.isProcessing = false;
    }
  }

  async generateIndexes() {
    console.log('📋 Generando índices...');
    
    const dateFolders = fs.readdirSync(this.feedsDir)
      .filter(folder => /^\d{4}-\d{2}-\d{2}$/.test(folder))
      .sort()
      .reverse();

    for (const dateFolder of dateFolders) {
      await this.generateDateIndex(dateFolder);
    }
    
    console.log('📋 Índices generados');
  }

  async generateDateIndex(dateFolder) {
    const datePath = path.join(this.feedsDir, dateFolder);
    const indexPath = path.join(datePath, 'index.html');
    
    // Obtener noticias de esta fecha
    const htmlFiles = fs.readdirSync(datePath)
      .filter(file => file.endsWith('.html') && file !== 'index.html');

    if (htmlFiles.length === 0) {
      return;
    }

    const indexContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Noticias del ${dateFolder} · Corvus News</title>
  <meta name="description" content="Todas las noticias e investigaciones del ${dateFolder} de Corvus News.">
  <link rel="stylesheet" href="../../assets/style.css">
  <script src="../../js/news-data.js"></script>
</head>
<body>
  <!-- Navigation -->
  <nav class="topbar">
    <div class="topbar-container">
      <a href="../../index.html" class="topbar-brand">
        <span class="brand-text">Corvus News</span>
      </a>
      <div class="nav-desktop">
        <a href="../${dateFolder}/" class="nav-link">Noticias</a>
        <a href="../../guia.html" class="nav-link">Guía Segura</a>
        <a href="../../mirrors.html" class="nav-link">Mirrors</a>
        <a href="../../contacto.html" class="nav-cta">Contacto</a>
      </div>
      <button class="menu-toggle" onclick="toggleMobileMenu()" aria-label="Abrir menú">
        <span id="menu-icon">☰</span>
      </button>
    </div>
    <div class="nav-mobile" id="nav-mobile">
      <a href="../${dateFolder}/" class="nav-link">Noticias</a>
      <a href="../../guia.html" class="nav-link">Guía Segura</a>
      <a href="../../mirrors.html" class="nav-link">Mirrors</a>
      <a href="../../contacto.html" class="nav-cta">Contacto</a>
    </div>
  </nav>

  <br/><br/><br/>

  <main style="padding-top: 80px;">
    <div style="max-width: 1200px; margin: 0 auto; padding: 2rem;">
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 3rem; padding: 2rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-primary);">
        <h1 style="font-family: var(--font-display); font-size: 2.5rem; font-weight: 700; margin-bottom: 1rem; color: var(--text-primary);">
          Noticias del ${new Date(dateFolder).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
        </h1>
        <p style="color: var(--text-secondary); font-size: 1.125rem;">
          ${htmlFiles.length} investigación${htmlFiles.length !== 1 ? 'es' : ''} verificada${htmlFiles.length !== 1 ? 's' : ''}
        </p>
      </div>

      <!-- News Grid -->
      <div id="date-news-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 2rem;">
        <!-- Las noticias se cargarán automáticamente aquí -->
      </div>
    </div>
  </main>

  <!-- Footer -->
  <footer>
    <div class="footer-content">
      <div class="footer-section">
        <h3>Corvus News</h3>
        <p style="color: var(--text-secondary);">
          Periodismo independiente y verificado.
        </p>
      </div>
      <div class="footer-section">
        <h3>Navegación</h3>
        <ul>
          <li><a href="../../index.html">Inicio</a></li>
          <li><a href="../../contacto.html">Contacto</a></li>
          <li><a href="../../guia.html">Guía Segura</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2025 Corvus News. Periodismo independiente.</p>
    </div>
  </footer>

  <script>
    function toggleMobileMenu() {
      const mobileNav = document.getElementById('nav-mobile');
      const menuIcon = document.getElementById('menu-icon');
      mobileNav.classList.toggle('show');
      menuIcon.textContent = mobileNav.classList.contains('show') ? '✕' : '☰';
    }

    document.addEventListener('click', function(event) {
      const mobileNav = document.getElementById('nav-mobile');
      const menuToggle = document.querySelector('.menu-toggle');
      if (!mobileNav.contains(event.target) && !menuToggle.contains(event.target)) {
        mobileNav.classList.remove('show');
        document.getElementById('menu-icon').textContent = '☰';
      }
    });

    // Cargar noticias de esta fecha
    document.addEventListener('DOMContentLoaded', function() {
      const newsGrid = document.getElementById('date-news-grid');
      const targetDate = '${dateFolder}';
      
      if (typeof NewsManager !== 'undefined') {
        const allNews = NewsManager.getAllNews();
        const dateNews = allNews.filter(news => news.date.startsWith(targetDate));

        if (dateNews.length === 0) {
          newsGrid.innerHTML = \`
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
              <h3>No hay noticias para esta fecha</h3>
              <p>Las noticias se están procesando...</p>
            </div>
          \`;
          return;
        }

        dateNews.forEach(news => {
          const article = document.createElement('article');
          article.style.cssText = 'background: var(--bg-card); border: 1px solid var(--border-primary); border-radius: var(--radius-lg); overflow: hidden; transition: var(--transition);';

          const categoryColor = '#666666';

          article.innerHTML = \`
            <div style="width: 100%; height: 200px; background: linear-gradient(135deg, \${categoryColor}, var(--bg-secondary)); display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 3rem; color: white; opacity: 0.8;">\${news.image}</span>
            </div>
            <div style="padding: 2rem;">
              <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; font-size: 0.875rem; color: var(--text-muted);">
                <span>\${NewsManager.formatDate(news.date)}</span>
                <span>\${news.author}</span>
              </div>
              <h3 style="font-family: var(--font-display); font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem; color: var(--text-primary);">
                \${news.title}
              </h3>
              <p style="color: var(--text-secondary); margin-bottom: 1.5rem; line-height: 1.6;">
                \${news.excerpt}
              </p>
              <a href="\${news.link}" style="color: \${categoryColor}; text-decoration: none; font-weight: 600;">
                Leer noticia completa →
              </a>
            </div>
          \`;

          newsGrid.appendChild(article);
        });
      }
    });
  </script>
</body>
</html>`;

    fs.writeFileSync(indexPath, indexContent, 'utf8');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const watcher = new FeedsWatcher();
  watcher.start();
}

module.exports = FeedsWatcher;