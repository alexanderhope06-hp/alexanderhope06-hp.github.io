/* =====================================================
   STORYNEST — WISDOM POST VIEWER
   ===================================================== */

(function () {
    'use strict';

    const WISDOM_POSTS = {
        1: {
            category: 'My Son',
            title: 'Dear Son, Build Yourself First',
            content: [
                "Dear son, don't spend your entire youth trying to convince someone that you're worthy of their love.",
                'Love is beautiful, but it should never become the only thing you build your life around.',
                'Learn a skill. Take care of your health. Understand money. Build friendships with people who genuinely want to see you succeed.',
                "And don't confuse loneliness with failure."
            ],
            highlight: "Build yourself so strongly that losing someone doesn't make you lose yourself.",
            ending: 'The right person should add something beautiful to your life, not become the entire foundation of it.'
        },

        2: {
            category: 'My Daughter',
            title: 'Dear Daughter, Never Beg for Respect',
            content: [
                'Dear daughter, never shrink yourself just because someone is uncomfortable with your confidence.',
                "You don't have to become smaller to make another person feel important.",
                'Learn to recognize the difference between someone who corrects you because they care and someone who controls you because they fear losing power.',
                'Your kindness is valuable, but kindness does not require you to accept disrespect.'
            ],
            highlight: 'Never trade your self-respect for temporary attention.',
            ending: 'The right people will appreciate your strength rather than asking you to hide it.'
        },

        3: {
            category: 'Things Nobody Tells You',
            title: 'Nobody Is Coming to Save Your Future',
            content: [
                'Nobody tells you how powerful small decisions become when you repeat them for years.',
                'The book you read today might change something you do tomorrow. The skill you learn this month might feed you for years.',
                'Your future is rarely destroyed by one enormous mistake. Sometimes it is simply neglected through thousands of tiny decisions.'
            ],
            highlight: 'Your future is being built today, whether you are building it intentionally or not.',
            ending: 'Start with something small. Small progress is still progress.'
        },

        4: {
            category: 'Life Is Funny',
            title: 'Life Has a Strange Sense of Humor 😂',
            content: [
                'When you are young, you dream about having money.',
                'Then you finally start making money and suddenly everyone remembers your phone number.',
                "Your relatives discover emergencies. Your friends discover business opportunities. Even that person who ignored your messages suddenly says, 'Long time!' 😂"
            ],
            highlight: 'Sometimes the fastest way to discover who loves you is to become successful.',
            ending: "Just remember: having money doesn't mean you have to become everybody's emergency department."
        },

        5: {
            category: 'Hard Truths',
            title: 'Not Everyone Wants You to Win',
            content: [
                'Some people will genuinely celebrate your success.',
                'Others will become strangely quiet when your life starts improving.',
                "You don't need to hate them. You don't even need to confront them.",
                'Simply learn who deserves a front-row seat in your life.'
            ],
            highlight: 'You can forgive someone without giving them access to everything you are building.',
            ending: 'Protect your peace without becoming bitter.'
        },

        6: {
            category: 'Before You Love Someone',
            title: 'Before You Give Someone Your Heart',
            content: [
                'Before you fall deeply in love with someone, pay attention to their character.',
                'Watch how they treat people who cannot benefit them.',
                'Watch how they behave when they are angry, disappointed or told no.',
                'Beautiful words are easy. Character takes time to reveal itself.'
            ],
            highlight: "Don't only listen to what someone says about themselves. Watch what their behavior says about them.",
            ending: 'Love wisely. Your heart deserves more than good promises.'
        },

        7: {
            category: 'One Minute Wisdom',
            title: 'Your Time Is Expensive',
            content: [
                'Money can sometimes be recovered.',
                'Opportunities can sometimes return.',
                'But yesterday never comes back.',
                'Be careful what receives the best hours of your day.'
            ],
            highlight: 'Your time is one of the few things you spend without knowing exactly how much you have left.',
            ending: 'Use it wisely.'
        },

        8: {
            category: 'My Friend',
            title: "Dear Friend, Don't Confuse History With Loyalty",
            content: [
                'Dear friend, knowing someone for ten years does not automatically mean they deserve access to your next ten.',
                'People change. Circumstances change. Sometimes friendships grow together, and sometimes they grow apart.',
                'You can appreciate the memories without pretending everything is still the same.'
            ],
            highlight: 'A long friendship is valuable, but loyalty must still be earned in the present.',
            ending: "Keep the good memories. But don't let yesterday blind you to today."
        },

        9: {
            category: 'My Enemy',
            title: 'Dear Enemy, Thank You for the Lesson',
            content: [
                'Dear enemy, you probably thought you were making my life harder.',
                'You were.',
                "But you also taught me something I wouldn't have learned from people who loved me.",
                'You taught me to pay attention. To choose people carefully. To stop explaining myself to everyone.'
            ],
            highlight: 'Sometimes the person who challenges you the most teaches you the lesson you needed the most.',
            ending: "I don't need revenge. Growth is enough."
        }
    };

    const params = new URLSearchParams(window.location.search);
    const postId = params.get('id');
    const post = WISDOM_POSTS[postId];
    const container = document.getElementById('postContainer');

    if (!container) return;

    if (!post) {
        container.innerHTML = `
            <section class="not-found">
                <h1>Wisdom Not Found</h1>
                <p>This wisdom post doesn't exist or may have been removed.</p>
                <br>
                <a href="wisdom.html">Explore Life & Wisdom →</a>
            </section>
        `;
        return;
    }

    const paragraphs = post.content.map(text => `<p>${escapeHTML(text)}</p>`).join('');

    container.innerHTML = `
        <header class="post-header">
            <div class="post-category">${escapeHTML(post.category)}</div>
            <h1>${escapeHTML(post.title)}</h1>
            <div class="post-date">StoryNest • Life & Wisdom</div>
        </header>

        <article class="post-body">
            ${paragraphs}
            <div class="highlight">${escapeHTML(post.highlight)}</div>
            <p>${escapeHTML(post.ending)}</p>
        </article>

        <section class="share-section">
            <h3>Enjoyed this?</h3>
            <p>Share it with someone who needs to read it.</p>
            <div class="share-buttons">
                <button class="share-btn facebook-btn" id="shareFacebookBtn">Facebook</button>
                <button class="share-btn whatsapp-btn" id="shareWhatsAppBtn">WhatsApp</button>
                <button class="share-btn copy-btn" id="copyPostBtn">Copy Link</button>
            </div>
        </section>

        <section class="more-wisdom">
            <h2>More Life & Wisdom</h2>
            <p>More funny truths, lessons and observations are waiting on StoryNest.</p>
            <a href="wisdom.html">Explore More →</a>
        </section>
    `;

    document.title = post.title + ' — StoryNest';

    // Wire up share buttons
    document.getElementById('shareFacebookBtn').addEventListener('click', shareFacebook);
    document.getElementById('shareWhatsAppBtn').addEventListener('click', shareWhatsApp);
    document.getElementById('copyPostBtn').addEventListener('click', copyPost);

    function shareFacebook() {
        const url = encodeURIComponent(window.location.href);
        window.open('https://www.facebook.com/sharer/sharer.php?u=' + url, '_blank');
    }

    function shareWhatsApp() {
        const text = encodeURIComponent(
            post.title + '\n\nRead it on StoryNest:\n' + window.location.href
        );
        window.open('https://wa.me/?text=' + text, '_blank');
    }

    async function copyPost() {
        try {
            await navigator.clipboard.writeText(window.location.href);
            alert('StoryNest link copied!');
        } catch (_) {
            alert('Unable to copy automatically. Please copy the page URL.');
        }
    }

    function escapeHTML(value) {
        const div = document.createElement('div');
        div.textContent = value ?? '';
        return div.innerHTML;
    }
})();