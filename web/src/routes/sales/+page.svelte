<script lang="ts">
	let { data } = $props();
	const { orders } = data;
</script>

<svelte:head>
	<title>Sales - Philos MVP</title>
</svelte:head>

<div class="page-container">
	<div class="header">
		<h1>Recent Sales</h1>
		<p>Showing the 50 most recent orders across all channels.</p>
	</div>

	<div class="card table-container">
		<table>
			<thead>
				<tr>
					<th>Order ID</th>
					<th>Date</th>
					<th>Channel</th>
					<th>Type</th>
					<th>Status</th>
					<th class="text-right">Grand Total</th>
				</tr>
			</thead>
			<tbody>
				{#each orders as order}
					<tr>
						<td class="font-medium">{order.original_order_id}</td>
						<td class="text-muted">{new Date(order.order_date).toLocaleString()}</td>
						<td>
							<span class="badge" class:badge-swiggy={order.channel === 'Swiggy'} class:badge-zomato={order.channel === 'Zomato'} class:badge-counter={order.channel === 'Counter'}>
								{order.channel}
							</span>
						</td>
						<td>{order.order_type || 'N/A'}</td>
						<td>
							<span class="status-dot" class:status-success={order.status?.toLowerCase() === 'delivered' || order.status?.toLowerCase() === 'printed'}></span>
							{order.status || 'Unknown'}
						</td>
						<td class="text-right font-bold">₹{(order.grand_total || 0).toFixed(2)}</td>
					</tr>
				{:else}
					<tr>
						<td colspan="6" class="text-center text-muted" style="padding: 3rem;">No orders found.</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	.page-container {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.header h1 {
		font-size: 2rem;
		font-weight: 700;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
	}

	.header p {
		color: var(--text-secondary);
	}

	.table-container {
		overflow-x: auto;
		padding: 0; /* Remove card padding for flush table */
	}

	table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
	}

	th, td {
		padding: 1rem 1.5rem;
		border-bottom: 1px solid var(--border-color);
	}

	th {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		background-color: rgba(0, 0, 0, 0.02);
	}

	:global([data-theme='dark']) th {
		background-color: rgba(255, 255, 255, 0.02);
	}

	tr:last-child td {
		border-bottom: none;
	}

	.font-medium { font-weight: 500; }
	.font-bold { font-weight: 700; color: var(--text-primary); }
	.text-right { text-align: right; }
	.text-center { text-align: center; }
	.text-muted { color: var(--text-secondary); font-size: 0.875rem; }

	.badge {
		display: inline-flex;
		align-items: center;
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
	}

	.badge-swiggy { background-color: #fc801920; color: #fc8019; }
	.badge-zomato { background-color: #cb202d20; color: #cb202d; }
	.badge-counter { background-color: #2b6cb020; color: #2b6cb0; }

	:global([data-theme='dark']) .badge-swiggy { background-color: #fc801940; color: #ffb073; }
	:global([data-theme='dark']) .badge-zomato { background-color: #cb202d40; color: #ff858d; }
	:global([data-theme='dark']) .badge-counter { background-color: #2b6cb040; color: #90cdf4; }

	.status-dot {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background-color: var(--text-secondary);
		margin-right: 6px;
	}

	.status-success {
		background-color: #48bb78;
	}
</style>
