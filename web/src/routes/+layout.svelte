<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<svelte:head>
	<title>Philos | Business Portal</title>
</svelte:head>

<div class="app-container">
	<!-- Sidebar -->
	<aside class="sidebar card">
		<div class="logo">
			<h2>Philos</h2>
		</div>
		<nav>
			<a href="/" class="nav-item active">Dashboard</a>
			<a href="/sales" class="nav-item">Sales</a>
			<a href="/businesses" class="nav-item">Businesses</a>
			<a href="/settings" class="nav-item">Settings</a>
		</nav>
	</aside>

	<!-- Main Content -->
	<main class="main-content">
		<header class="top-header card">
			<div class="search-bar">
				<input type="text" placeholder="Search..." />
			</div>
			<div class="user-profile">
				<div class="avatar">A</div>
			</div>
		</header>
		
		<div class="page-content">
			{@render children()}
		</div>
	</main>
</div>

<style>
	.app-container {
		display: flex;
		height: 100vh;
		background: var(--bg-secondary);
	}

	.sidebar {
		width: 260px;
		display: flex;
		flex-direction: column;
		border-radius: 0;
		border-top: none;
		border-bottom: none;
		border-left: none;
	}

	.logo {
		padding: 1.5rem;
		border-bottom: 1px solid var(--border-color);
	}

	.logo h2 {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	nav {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.nav-item {
		padding: 0.5rem 1rem;
		border-radius: var(--border-radius);
		color: var(--text-secondary);
		text-decoration: none;
		font-weight: 500;
		font-size: 0.875rem;
		transition: all 0.2s ease;
	}

	.nav-item:hover {
		background: var(--bg-secondary);
		color: var(--text-primary);
	}

	.nav-item.active {
		background: var(--bg-secondary);
		color: var(--accent-primary);
		font-weight: 600;
	}

	.main-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
	}

	.top-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 2rem;
		border-radius: 0;
		border-top: none;
		border-left: none;
		border-right: none;
	}

	.search-bar {
		width: 300px;
	}

	.search-bar input {
		width: 100%;
		padding: 0.5rem 1rem;
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
		background: var(--bg-secondary);
		color: var(--text-primary);
		outline: none;
		font-family: inherit;
		font-size: 0.875rem;
	}
    
    .search-bar input:focus {
        border-color: var(--accent-primary);
    }

	.user-profile {
		display: flex;
		align-items: center;
	}

	.avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		background: var(--accent-primary);
        color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.page-content {
		padding: 2rem;
		flex: 1;
	}
</style>
