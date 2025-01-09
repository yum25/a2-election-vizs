// JS for your graphic
import * as d3 from 'd3'; // TODO - only import the parts of d3 you need

const draw = async (lineType, date, endTime, ummaMultiplier, dudeMultiplier) => {
	const electionData = await d3.json(
		'https://magnify.michigandaily.us/washtenaw-2024-elections/wait_times.json'
	);

	const peak = 130 * 0.75;

	const parseTime = d3.timeParse('%A, %b %d, %Y %I:%M:%S %p');

	let dude = electionData[`${lineType} - Duderstadt Center/Pierpont`].map((d) => ({
		time: parseTime(d.time),
		wait_time: Math.floor(d.wait_time) * dudeMultiplier,
		line_length: d.line_length,
		last_updated: d.last_updated
	}));
	dude = dude.filter(
		(d) =>
			d.time > parseTime(`${date}, 2024 8:35:00 AM`) &&
			d.time < parseTime(`${date}, 2024 ${endTime}`)
	);

	let umma = electionData[`${lineType} - University of Michigan Museum of Art`].map((d) => ({
		time: parseTime(d.time),
		wait_time: Math.floor(d.wait_time) * ummaMultiplier,
		line_length: d.line_length,
		last_updated: d.last_updated
	}));
	umma = umma.filter(
		(d) =>
			d.time > parseTime(`${date}, 2024 8:35:00 AM`) &&
			d.time < parseTime(`${date}, 2024 ${endTime}`)
	);

	let umma_last_updated = umma.slice(-1)[0]['last_updated'];
	if (umma_last_updated) {
		umma_last_updated = parseTime(
			`${date}, 2024 ${umma_last_updated.slice(0, 5)}:00 ${umma_last_updated.slice(-2)}`
		);
	}

	if (umma_last_updated > umma.slice(-1)[0]['time']) {
		umma_last_updated = null;
	}

	let dude_last_updated = dude.slice(-1)[0]['last_updated'];

	if (dude_last_updated) {
		dude_last_updated = parseTime(
			`${date}, 2024 ${dude_last_updated.slice(0, 5)}:00 ${dude_last_updated.slice(-2)}`
		);
	}

	if (dude_last_updated > dude.slice(-1)[0]['time']) {
		dude_last_updated = null;
	}

	let last_updated = umma_last_updated;
	if (umma_last_updated < dude_last_updated) {
		last_updated = dude_last_updated;
	}

	// set the dimensions and margins of the graph
	const margin = { top: 10, right: 100, bottom: 30, left: 40 },
		width = 600 - margin.left - margin.right,
		height = 400 - margin.top - margin.bottom;

	const div = d3.select('figure').append('div');

	div.append('h2').text(`Wait Times: ${lineType}`);
	div
		.append('h3')
		.append('i')
		.html(
			`The <b>UMMA</b> currently has an estimated <b>wait time of ${
				umma.slice(-1)[0].wait_time
			} minutes</b>, and the <b>Duderstadt</b> has an estimated <b>wait time of ${
				dude.slice(-1)[0].wait_time
			} minutes</b>.`
		);

	// step 3: draw canvas
	const svg = div
		.append('svg')
		.attr(
			'viewBox',
			`0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`
		)
		.append('g')
		.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

	// Add X axis --> it is a time format
	var x = d3
		.scaleTime()
		.domain([
			parseTime(`${date}, 2024 8:00:00 AM`),
			d3.max(umma, function () {
				const end = parseTime(`${date}, 2024 08:00:00 PM`);
				return parseTime(`${date}, 2024 ${endTime}`) ?? end;
			})
		])
		.range([0, width]);

	svg
		.append('g')
		.attr('transform', 'translate(0,' + height + ')')
		.call(d3.axisBottom(x));

	// Add Y axis
	var y = d3
		.scaleLinear()
		.domain([
			0,
			Math.max(
				d3.max(umma, function (d) {
					return d.wait_time > peak ? d.wait_time : peak;
				}),
				d3.max(dude, function (d) {
					return d.wait_time > peak ? d.wait_time : peak;
				})
			)
		])
		.range([height, 0]);
	svg.append('g').call(d3.axisLeft(y));

	// Add the line
	svg
		.append('path')
		.datum(dude)
		.attr('fill', 'none')
		.attr('stroke', '#665191')
		.attr('stroke-width', 3)
		.attr(
			'd',
			d3
				.line()
				.x(function (d) {
					return x(d.time);
				})
				.y(function (d) {
					return y(d.wait_time);
				})
		);
	svg
		.append('path')
		.datum(umma)
		.attr('fill', 'none')
		.attr('stroke', '#FFA600')
		.attr('stroke-width', 3)
		.attr(
			'd',
			d3
				.line()
				.x(function (d) {
					return x(d.time);
				})
				.y(function (d) {
					return y(d.wait_time);
				})
		);

	// Add invisible dots as tooltip anchors
	svg
		.append('g')
		.selectAll('dot')
		.data(umma)
		.enter()
		.append('circle')
		.attr('cx', function (d) {
			return x(d.time);
		})
		.attr('cy', function (d) {
			return y(d.wait_time);
		})
		.attr('r', 3)
		.style('fill', 'transparent')
		.on('mouseover', function (e, d) {
			const posx =
				e.clientX > (width + margin.right + margin.left) / 2 ? e.clientX - 230 : e.clientX;
				const posy = e.clientY
			d3.select('#tooltip')
				.html(
					`<b>UMMA - ${lineType} Line</b>: <br/>${d.wait_time} minutes<br/>${
						d.line_length
					} people waiting
					<br/><i>${d.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</i>`
				)
				.style('transform', `translate(${posx}px, ${posy}px)`)
				.style('opacity', 1);
		})
		.on('mouseout', function () {
			d3.select('#tooltip').style('opacity', 0);
		});

	svg
		.append('g')
		.selectAll('dot')
		.data(dude)
		.enter()
		.append('circle')
		.attr('cx', function (d) {
			return x(d.time);
		})
		.attr('cy', function (d) {
			return y(d.wait_time);
		})
		.attr('r', 3)
		.style('fill', 'transparent')
		.on('mouseover', function (e, d) {
			const posx =
				e.clientX > (width + margin.right + margin.left) / 2 ? e.clientX - 230 : e.clientX;
			const posy = e.clientY
			d3.select('#tooltip')
				.html(
					`<b>Duderstadt - ${lineType} Line</b>: <br/>${d.wait_time} minutes<br/>${
						d.line_length
					} people waiting
					<br/><i>${d.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</i>`
				)
				.style('transform', `translate(${posx}px, ${posy}px)`)
				.style('opacity', 1);
		})
		.on('mouseout', function () {
			d3.select('#tooltip').style('opacity', 0);
		});

	// add legend
	svg.append('circle').attr('cx', width).attr('cy', 20).attr('r', 6).style('fill', '#FFA600');
	svg.append('circle').attr('cx', width).attr('cy', 40).attr('r', 6).style('fill', '#665191');
	svg
		.append('text')
		.attr('x', width + 10)
		.attr('y', 20)
		.text('UMMA')
		.style('font-size', '15px')
		.attr('alignment-baseline', 'middle');
	svg
		.append('text')
		.attr('x', width + 10)
		.attr('y', 40)
		.text('Duderstadt')
		.style('font-size', '15px')
		.attr('alignment-baseline', 'middle');

	// add horizontal line at y 130 minutes
	svg
		.append('line')
		.attr('x1', 0)
		.attr('y1', y(peak))
		.attr('x2', width)
		.attr('y2', y(peak))
		.attr('stroke', 'grey')
		// dotted line
		.attr('stroke-dasharray', '5,5')
		.attr('stroke-width', 2)
		.style('pointer-events', 'none');
	// add text peak wait time on Monday
	svg
		.append('text')
		.attr('x', 5)
		.attr('y', y(peak - 5))
		.attr('fill', 'grey')
		.text('Peak registration wait time on Monday, Nov 4th')
		.style('font-size', '15px')
		.attr('alignment-baseline', 'middle')
		.style('pointer-events', 'none');

	if (last_updated) {
		// add vertical line at last update
		svg
			.append('line')
			.attr('x1', x(last_updated))
			.attr('y1', 0)
			.attr('x2', x(last_updated))
			.attr('y2', height)
			.attr('stroke', 'grey')
			// dotted line
			.attr('stroke-dasharray', '5,5')
			.attr('stroke-width', 2)
			.style('pointer-events', 'none');
		// add text at last update
		svg
			.append('text')
			.attr('fill', 'grey')
			.attr('x', x(last_updated) + 5)
			.attr('y', height - 10)
			.text('Time of last update')
			.style('font-size', '15px')
			.attr('alignment-baseline', 'middle')
			.style('pointer-events', 'none');
	}

	// step 6: draw peripherals
	// step 7: set up interactions
};

window.onresize = () => {};

window.onload = () => {
	// Time of 0.75 adjustment: 12:43
	draw('Voter Registration', 'Monday, Nov 04', '04:00:00 PM', 0.75, 0.75);
	draw('Voter Registration', 'Tuesday, Nov 05', '08:00:00 PM', 1, 0.75);
};
