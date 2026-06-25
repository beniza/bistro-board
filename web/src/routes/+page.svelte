<script lang="ts">
</script>

<div class="dashboard">
	<header class="page-header">
		<div>
			<h1>Dashboard</h1>
			<p class="subtitle">Overview of your business metrics.</p>
		</div>
		<button class="btn btn-primary">Download Report</button>
	</header>

	<div class="stats-grid">
		<div class="stat-card card">
			<div class="stat-info">
				<h3>Total Revenue</h3>
				<div class="value">$124,500</div>
				<div class="trend positive">+14.5% vs last month</div>
			</div>
		</div>
		
		<div class="stat-card card">
			<div class="stat-info">
				<h3>Active Businesses</h3>
				<div class="value">842</div>
				<div class="trend positive">+2.1% vs last month</div>
			</div>
		</div>

		<div class="stat-card card">
			<div class="stat-info">
				<h3>Successful Deals</h3>
				<div class="value">156</div>
				<div class="trend positive">+8.4% vs last month</div>
			</div>
		</div>
	</div>

	<div class="content-grid">
		<div class="chart-section card">
			<div class="section-header">
				<h2>Revenue Overview</h2>
				<select class="simple-select">
					<option>Last 30 Days</option>
					<option>This Year</option>
				</select>
			</div>
			<!-- Placeholder for chart -->
			<div class="chart-placeholder">
				<div class="bar-chart">
					<div class="bar" style="height: 40%"></div>
					<div class="bar" style="height: 60%"></div>
					<div class="bar" style="height: 35%"></div>
					<div class="bar" style="height: 80%"></div>
					<div class="bar" style="height: 50%"></div>
					<div class="bar" style="height: 95%"></div>
					<div class="bar" style="height: 70%"></div>
				</div>
			</div>
		</div>

		<div class="recent-activity card">
			<div class="section-header">
				<h2>Recent Activity</h2>
			</div>
			<div class="activity-list">
				<div class="activity-item">
					<div class="activity-dot"></div>
					<div class="activity-content">
						<p><strong>Tech Solutions Inc.</strong> registered</p>
						<small>2 hours ago</small>
					</div>
				</div>
				<div class="activity-item">
					<div class="activity-dot"></div>
					<div class="activity-content">
						<p>New sale closed: $4,200</p>
						<small>5 hours ago</small>
					</div>
				</div>
				<div class="activity-item">
					<div class="activity-dot"></div>
					<div class="activity-content">
						<p>Database sync completed</p>
						<small>1 day ago</small>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.dashboard {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	h1 {
		font-size: 1.5rem;
		font-weight: 600;
		margin-bottom: 0.25rem;
	}

	.subtitle {
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
	}

	.stat-card {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
	}

	.stat-info h3 {
		color: var(--text-secondary);
		font-size: 0.875rem;
		font-weight: 500;
		margin-bottom: 0.5rem;
	}

	.stat-info .value {
		font-size: 1.875rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.trend {
		font-size: 0.75rem;
		font-weight: 500;
		margin-top: 0.5rem;
	}

	.trend.positive {
		color: var(--success);
	}

	.content-grid {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 1.5rem;
	}

	.chart-section, .recent-activity {
		padding: 1.5rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.section-header h2 {
		font-size: 1.125rem;
		font-weight: 600;
	}

	.simple-select {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		color: var(--text-primary);
		padding: 0.25rem 0.5rem;
		border-radius: var(--border-radius);
		outline: none;
		font-family: inherit;
		font-size: 0.875rem;
	}

	.chart-placeholder {
		height: 250px;
		display: flex;
		align-items: flex-end;
		padding-top: 1rem;
	}

	.bar-chart {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		width: 100%;
		height: 100%;
		gap: 1rem;
	}

	.bar {
		flex: 1;
		background: var(--accent-primary);
		border-radius: 4px 4px 0 0;
		opacity: 0.8;
	}

	.bar:hover {
		opacity: 1;
	}

	.activity-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.activity-item {
		display: flex;
		gap: 0.75rem;
	}

	.activity-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--accent-primary);
		margin-top: 0.4rem;
	}

	.activity-content p {
		font-size: 0.875rem;
		color: var(--text-primary);
	}

	.activity-content small {
		color: var(--text-secondary);
		font-size: 0.75rem;
	}
</style>
