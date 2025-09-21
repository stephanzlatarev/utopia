// Markdown parsing utility
function parseMarkdown(markdown) {
    // Split into blocks first
    const blocks = markdown.split(/\n\s*\n/);
    let html = '';
    
    blocks.forEach(block => {
        const trimmedBlock = block.trim();
        if (!trimmedBlock) return;
        
        // Headers
        if (trimmedBlock.match(/^# /)) {
            html += trimmedBlock.replace(/^# (.*)/, '<h1>$1</h1>');
        } else if (trimmedBlock.match(/^## /)) {
            html += trimmedBlock.replace(/^## (.*)/, '<h2>$1</h2>');
        } else if (trimmedBlock.match(/^### /)) {
            html += trimmedBlock.replace(/^### (.*)/, '<h3>$1</h3>');
        } else if (trimmedBlock.match(/^#### /)) {
            html += trimmedBlock.replace(/^#### (.*)/, '<h4>$1</h4>');
        }
        // Lists
        else if (trimmedBlock.match(/^[\-\*] /m)) {
            const listItems = trimmedBlock.split('\n')
                .filter(line => line.trim())
                .map(line => line.replace(/^[\-\*] (.*)/, '<li>$1</li>'))
                .join('');
            html += '<ul>' + listItems + '</ul>';
        }
        // Code blocks
        else if (trimmedBlock.startsWith('```')) {
            const codeContent = trimmedBlock.replace(/```[\s\S]*?\n([\s\S]*?)```/, '$1');
            html += '<pre><code>' + codeContent + '</code></pre>';
        }
        // Blockquotes
        else if (trimmedBlock.startsWith('>')) {
            const quoteContent = trimmedBlock.replace(/^> /gm, '');
            html += '<blockquote><p>' + processInlineMarkdown(quoteContent) + '</p></blockquote>';
        }
        // Regular paragraphs
        else {
            html += '<p>' + processInlineMarkdown(trimmedBlock) + '</p>';
        }
    });
    
    return html;
}

// Process inline markdown elements
function processInlineMarkdown(text) {
    return text
        // Bold and italic
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        
        // Code
        .replace(/`(.*?)`/g, '<code>$1</code>')
        
        // Links
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        
        // Single line breaks become spaces, preserve the text flow
        .replace(/\n/g, ' ');
}

// Load markdown content and render it
async function loadMarkdownContent(filename, containerId) {
    try {
        const response = await fetch(`content/${filename}`);
        if (!response.ok) {
            throw new Error(`Failed to load ${filename}`);
        }
        const markdown = await response.text();
        const html = parseMarkdown(markdown);
        
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = html;
            
            // Add appropriate classes to rendered elements
            container.querySelectorAll('h1').forEach(h1 => {
                h1.classList.add('section-title');
            });
            
            container.querySelectorAll('h2').forEach(h2 => {
                h2.classList.add('subsection-title');
            });
            
            container.querySelectorAll('h3').forEach(h3 => {
                h3.classList.add('card-title');
            });
            
            container.querySelectorAll('ul').forEach(ul => {
                ul.classList.add('feature-list');
            });
            
            container.querySelectorAll('p').forEach(p => {
                p.classList.add('content-paragraph');
            });
            
            // Process special content based on section
            if (containerId === 'description-content') {
                processDescriptionContent(container);
            } else if (containerId === 'principles-content') {
                processPrinciplesContent(container);
            } else if (containerId === 'specifications-content') {
                processTechSpecsContent(container);
            } else if (containerId === 'roadmap-content') {
                processRoadmapContent(container);
            }
            
            // Setup collapsible functionality for all sections
            setupCollapsibleSections(container);
        }
    } catch (error) {
        console.error('Error loading markdown content:', error);
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = '<p class="error-message">Failed to load content. Please try again later.</p>';
        }
    }
}

// Process description content into cards
function processDescriptionContent(container) {
    const sections = container.querySelectorAll('h2');
    let cardGrid = document.createElement('div');
    cardGrid.className = 'description-grid';
    
    sections.forEach(section => {
        if (section.textContent.includes('🏙️') || section.textContent.includes('🌱') || section.textContent.includes('🤝')) {
            const card = document.createElement('div');
            card.className = 'description-card';
            
            const icon = section.textContent.match(/[🏙️🌱🤝]/)?.[0] || '✨';
            const title = section.textContent.replace(/[🏙️🌱🤝]/, '').trim();
            
            let content = '<div class="card-icon">' + icon + '</div>';
            content += '<h3>' + title + '</h3>';
            
            // Get content until next h2 or end
            let currentElement = section.nextElementSibling;
            while (currentElement && currentElement.tagName !== 'H2') {
                if (currentElement.tagName === 'P' || currentElement.tagName === 'UL') {
                    content += currentElement.outerHTML;
                }
                currentElement = currentElement.nextElementSibling;
            }
            
            card.innerHTML = content;
            cardGrid.appendChild(card);
        } else {
            // Handle regular H2 sections with collapsible functionality
            const wrapper = document.createElement('div');
            wrapper.className = 'collapsible-section';
            
            // Create collapsible header
            const header = document.createElement('h2');
            header.className = 'subsection-title collapsed';
            header.innerHTML = section.textContent + ' <span class="chevron">▼</span>';
            header.style.cursor = 'pointer';
            
            // Create collapsible content wrapper
            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'collapsible-content collapsed';
            
            // Collect all content until next h2 or end
            let contentHTML = '';
            let currentElement = section.nextElementSibling;
            while (currentElement && currentElement.tagName !== 'H2') {
                contentHTML += currentElement.outerHTML;
                currentElement = currentElement.nextElementSibling;
            }
            contentWrapper.innerHTML = contentHTML;
            
            wrapper.appendChild(header);
            wrapper.appendChild(contentWrapper);
            cardGrid.appendChild(wrapper);
        }
    });
    
    if (cardGrid.children.length > 0) {
        // Replace the original content with the card grid
        container.innerHTML = '';
        container.appendChild(cardGrid);
    }
}

// Process principles content into principle items
function processPrinciplesContent(container) {
    const sections = container.querySelectorAll('h2');
    let principlesGrid = document.createElement('div');
    principlesGrid.className = 'principles-grid';
    
    sections.forEach((section, index) => {
        // Create collapsible wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'collapsible-section';
        
        // Create collapsible header
        const header = document.createElement('h2');
        header.className = 'subsection-title collapsed';
        header.innerHTML = section.textContent + ' <span class="chevron">▼</span>';
        header.style.cursor = 'pointer';
        
        // Create collapsible content wrapper
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'collapsible-content collapsed';
        
        const principleItem = document.createElement('div');
        principleItem.className = 'principle-item';
        
        const numberMatch = section.textContent.match(/(\d+)\./); 
        const number = numberMatch ? numberMatch[1] : (index + 1).toString().padStart(2, '0');
        const title = section.textContent.replace(/^\d+\.\s*/, '').replace(/[🌍🌈🤖🗳️🚀💚]/, '').trim();
        
        let content = '<div class="principle-number">' + number + '</div>';
        content += '<h3>' + title + '</h3>';
        
        // Collect all content until next h2 or end
        let currentElement = section.nextElementSibling;
        while (currentElement && currentElement.tagName !== 'H2') {
            content += currentElement.outerHTML;
            currentElement = currentElement.nextElementSibling;
        }
        
        principleItem.innerHTML = content;
        contentWrapper.appendChild(principleItem);
        
        wrapper.appendChild(header);
        wrapper.appendChild(contentWrapper);
        principlesGrid.appendChild(wrapper);
    });
    
    if (principlesGrid.children.length > 0) {
        container.innerHTML = '';
        container.appendChild(principlesGrid);
    }
}

// Process tech specs content into categories
function processTechSpecsContent(container) {
    const sections = container.querySelectorAll('h2');
    let techGrid = document.createElement('div');
    techGrid.className = 'tech-grid';
    
    sections.forEach(section => {
        // Create collapsible wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'collapsible-section';
        
        // Create collapsible header
        const header = document.createElement('h2');
        header.className = 'subsection-title collapsed';
        header.innerHTML = section.textContent + ' <span class="chevron">▼</span>';
        header.style.cursor = 'pointer';
        
        // Create collapsible content wrapper
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'collapsible-content collapsed';
        
        const category = document.createElement('div');
        category.className = 'tech-category';
        
        let content = '<h3>' + section.innerHTML + '</h3>';
        content += '<ul class="tech-list">';
        
        // Get content until next h2 or end
        let currentElement = section.nextElementSibling;
        while (currentElement && currentElement.tagName !== 'H2') {
            if (currentElement.tagName === 'H3') {
                const techItem = currentElement.textContent;
                let techDetails = '';
                
                // Get the list items that follow this h3
                let detailElement = currentElement.nextElementSibling;
                while (detailElement && detailElement.tagName !== 'H3' && detailElement.tagName !== 'H2') {
                    if (detailElement.tagName === 'UL') {
                        const listItems = detailElement.querySelectorAll('li');
                        listItems.forEach(li => {
                            const text = li.innerHTML;
                            const parts = text.split(':');
                            if (parts.length >= 2) {
                                techDetails += '<li><span class="tech-item">' + parts[0].replace(/\*\*/g, '') + ':</span> ' + parts.slice(1).join(':') + '</li>';
                            } else {
                                techDetails += '<li>' + text + '</li>';
                            }
                        });
                    }
                    detailElement = detailElement.nextElementSibling;
                }
                
                if (techDetails) {
                    content += '<li><strong>' + techItem + '</strong><ul>' + techDetails + '</ul></li>';
                }
            }
            currentElement = currentElement.nextElementSibling;
        }
        
        content += '</ul>';
        category.innerHTML = content;
        contentWrapper.appendChild(category);
        
        wrapper.appendChild(header);
        wrapper.appendChild(contentWrapper);
        techGrid.appendChild(wrapper);
    });
    
    if (techGrid.children.length > 0) {
        container.innerHTML = '';
        container.appendChild(techGrid);
    }
}

// Process roadmap content into timeline
function processRoadmapContent(container) {
    const sections = container.querySelectorAll('h2');
    let timeline = document.createElement('div');
    timeline.className = 'timeline';
    
    sections.forEach((section, index) => {
        // Create collapsible wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'collapsible-section';
        
        // Create collapsible header
        const header = document.createElement('h2');
        header.className = 'subsection-title collapsed';
        header.innerHTML = section.textContent + ' <span class="chevron">▼</span>';
        header.style.cursor = 'pointer';
        
        // Create collapsible content wrapper
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'collapsible-content collapsed';
        
        const timelineItem = document.createElement('div');
        timelineItem.className = 'timeline-item';
        
        const marker = document.createElement('div');
        marker.className = index === sections.length - 1 ? 'timeline-marker ultimate' : 'timeline-marker';
        
        const content = document.createElement('div');
        content.className = 'timeline-content';
        
        const title = section.textContent.replace(/[🏗️🌱🤖⚡✨]/, '').trim();
        const phase = title.match(/Phase \d+:|Ultimate Vision/)?.[0] || '';
        const period = title.match(/\(([^)]+)\)/)?.[1] || '';
        
        let htmlContent = '';
        if (phase && period) {
            htmlContent += '<div class="timeline-date">' + phase + ' ' + period + '</div>';
        }
        htmlContent += '<h3>' + title.replace(/Phase \d+:\s*/, '').replace(/\([^)]+\)/, '').trim() + '</h3>';
        
        // Get content until next h2 or end
        let currentElement = section.nextElementSibling;
        let features = [];
        
        while (currentElement && currentElement.tagName !== 'H2') {
            if (currentElement.tagName === 'P') {
                htmlContent += currentElement.outerHTML;
            } else if (currentElement.tagName === 'H4' && currentElement.textContent === 'Deliverables:') {
                // Look for the next list for deliverables/features
                let listElement = currentElement.nextElementSibling;
                while (listElement && listElement.tagName !== 'UL' && listElement.tagName !== 'H2') {
                    listElement = listElement.nextElementSibling;
                }
                if (listElement && listElement.tagName === 'UL') {
                    const items = listElement.querySelectorAll('li');
                    items.forEach(item => {
                        const text = item.textContent.replace(/[✅🎓🏥🚗🎨♻️🧠📡👥🌾🔄⚛️🌬️🥬🏭📊🌍⚖️🌟🔮]/, '').trim();
                        features.push(text);
                    });
                }
            }
            currentElement = currentElement.nextElementSibling;
        }
        
        if (features.length > 0) {
            htmlContent += '<div class="timeline-features">';
            features.forEach(feature => {
                htmlContent += '<span class="feature-tag">' + feature + '</span>';
            });
            htmlContent += '</div>';
        }
        
        content.innerHTML = htmlContent;
        timelineItem.appendChild(marker);
        timelineItem.appendChild(content);
        contentWrapper.appendChild(timelineItem);
        
        wrapper.appendChild(header);
        wrapper.appendChild(contentWrapper);
        timeline.appendChild(wrapper);
    });
    
    if (timeline.children.length > 0) {
        container.innerHTML = '';
        container.appendChild(timeline);
    }
}

// Setup collapsible sections functionality
function setupCollapsibleSections(container) {
    const collapsibleHeaders = container.querySelectorAll('.subsection-title');
    
    collapsibleHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const contentWrapper = this.nextElementSibling;
            const chevron = this.querySelector('.chevron');
            
            if (this.classList.contains('collapsed')) {
                // Expand
                this.classList.remove('collapsed');
                this.classList.add('expanded');
                contentWrapper.classList.remove('collapsed');
                contentWrapper.classList.add('expanded');
                chevron.textContent = '▲';
            } else {
                // Collapse
                this.classList.remove('expanded');
                this.classList.add('collapsed');
                contentWrapper.classList.remove('expanded');
                contentWrapper.classList.add('collapsed');
                chevron.textContent = '▼';
            }
        });
    });
}

// Smooth scrolling for navigation links
function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // Update active nav link
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
    
    // Update active nav link on scroll
    window.addEventListener('scroll', () => {
        const sections = ['home', 'description', 'principles', 'specifications', 'roadmap'];
        let currentSection = 'home';
        
        sections.forEach(section => {
            const element = document.getElementById(section);
            if (element) {
                const rect = element.getBoundingClientRect();
                if (rect.top <= 100 && rect.bottom > 100) {
                    currentSection = section;
                }
            }
        });
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + currentSection) {
                link.classList.add('active');
            }
        });
    });
}

// CTA button functionality
function setupCTAButton() {
    const ctaButton = document.querySelector('.cta-button');
    if (ctaButton) {
        ctaButton.addEventListener('click', () => {
            document.getElementById('description').scrollIntoView({
                behavior: 'smooth'
            });
        });
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupCTAButton();
    
    // Load all markdown content
    loadMarkdownContent('description.md', 'description-content');
    loadMarkdownContent('principles.md', 'principles-content');
    loadMarkdownContent('specifications.md', 'specifications-content');
    loadMarkdownContent('roadmap.md', 'roadmap-content');
});

// Intersection Observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe elements for animation
document.addEventListener('DOMContentLoaded', () => {
    const animateElements = document.querySelectorAll('.description-card, .principle-item, .tech-category, .timeline-item');
    animateElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});
