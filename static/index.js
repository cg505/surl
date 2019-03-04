'use strict';

const elem = React.createElement;

class Password extends React.PureComponent {
	constructor(props) {
		super(props);
		this.state = {
			key: props.defaultKey || '',
			hidden: true,
			savedKey: props.defaultKey,
		};
		this.typeKey = this.typeKey.bind(this);
		this.saveKey = this.saveKey.bind(this);
		this.showKey = this.showKey.bind(this);
	}

	typeKey(event) {
		this.setState({
			key: event.target.value,
		})
	}

	saveKey(event) {
		event.preventDefault();
		this.setState({
			savedKey: this.state.key,
		});
	}

	showKey(event) {
		this.setState({
			hidden: !this.state.hidden
		});
	}

	render() {
		const children = [elem('form', {
			key: 'pwd-form',
			onSubmit: this.saveKey,
		}, [
			elem('input', {
				key: 'password',
				type: this.state.hidden ? 'password' : 'text',
				value: this.state.key,
				onChange: this.typeKey,
			}),
			elem('input', {
				key: 'submit',
				type: 'submit',
				value: 'Save',
			}),
			elem('input', {
				key: 'show',
				type: 'button',
				onClick: this.showKey,
				value: this.state.hidden ? 'Show' : 'Hide',
			}),
		])];

		if (this.state.savedKey) {
			children.push(elem(DNS, {key: 'dns', apiKey: this.state.savedKey}));
			children.push(elem(Shorturls, {key: 'surl', apiKey: this.state.savedKey}));
		}

		return elem('div', null, children);
	}
}

class DNS extends React.PureComponent {
	constructor() {
		super();
		this.state = {
			updateToggle: false,
		};
		this.forceUpdate = this.forceUpdate.bind(this);
	}

	forceUpdate() {
		this.setState({
			updateToggle: !this.state.updateToggle,
		});
	}

	render() {
		return elem('div', null, [
			elem(Records, {
				key: 'records',
				apiKey: this.props.apiKey,
				updateToggle: this.state.updateToggle,
			}),
			elem(RecordForm, {
				key: 'form',
				apiKey: this.props.apiKey,
				update: this.forceUpdate,
			}),
		]);
	}
}

class Records extends React.PureComponent {
	constructor(props) {
		super(props);
		this.state = {
			loading: false,
			error: false,
			rrsets: [],
		};
		this.fetchZone = this.fetchZone.bind(this);
	}

	fetchZone() {
		this.setState({
			loading: true,
		});
		fetch('http://localhost:8000/pdns/api/v1/servers/localhost/zones/c3.wtf.', {
			headers: {
				'X-API-Key': this.props.apiKey,
			},
		})
			.then((res) => res.json())
			.then((json) => this.setState({
				loading: false,
				rrsets: json['rrsets']
			}));
	}

	componentDidMount() {
		this.fetchZone();
	}

	componentDidUpdate(prevProps) {
		if (
			this.props.apiKey !== prevProps.apiKey ||
			this.props.updateToggle != prevProps.updateToggle
		)
			this.fetchZone();
	}

	render() {
		if (this.state.loading) {
			return 'Loading...';
		}

		if (this.state.error) {
			return 'Error';
		}

		return elem('table', null, elem(
			'tbody', null,
			this.state.rrsets.map((rrset) =>
				elem(Record, {rrset, key: rrset['name'] + rrset['type']})
			))
		);
	}
}

class Record extends React.PureComponent {
	render() {
		const {rrset} = this.props;
		return elem('tr', null, [
			elem('td', {key: 'name'}, rrset['name']),
			elem('td', {key: 'type'}, rrset['type']),
			elem('td', {key: 'content'}, rrset['records'][0]['content']),
			elem('td', {key: 'ttl'}, rrset['ttl']),
		]);
	}
}

class RecordForm extends React.PureComponent {
	constructor(props) {
		super(props);
		this.formDefault = {
			name: '',
			type: 'A',
			content: '',
			ttl: '300',
		};
		this.state = {
			...this.formDefault,
			sending: false,
			errorStatus: null,
			errorBody: null,
		};

		this.handleChange = this.handleChange.bind(this);
		this.submit = this.submit.bind(this);
	}

	handleChange(event) {
		this.setState({
			[event.target.name]: event.target.value
		});
	}

	submit(event) {
		event.preventDefault();

		this.setState({
			sending: true,
			errorStatus: null,
			errorBody: null,
		});

		const data = {
			rrsets: [{
				changetype: "REPLACE",
				name: this.state.name,
				type: this.state.type,
				ttl: this.state.ttl,
				records: [{
					content: this.state.content,
					disabled: false,
				}],
			}],
		};
		fetch('http://localhost:8000/pdns/api/v1/servers/localhost/zones/c3.wtf.', {
			method: 'PATCH',
			headers: {
				'X-API-Key': this.props.apiKey,
			},
			body: JSON.stringify(data),
		})
			.then((res) => {
				if (!res.ok) {
					this.setState({
						sending: false,
						errorStatus: res.status,
					});
					res.json().then((json) =>
						this.setState({
							errorBody: json['error'],
						})
					);
				} else {
					this.setState({
						...this.formDefault,
						sending: false,
						errorStatus: null,
						errorBody: null,
					});
					this.props.update();
				}
			});
	}

	render() {
		const children = [
			elem('form', {key: 'frm', onSubmit: this.submit}, [
				elem('input', {
					key: 'name',
					type: 'text',
					placeholder: 'name',
					name: 'name',
					value: this.state.name,
					onChange: this.handleChange,
				}),
				elem('select', {
					key: 'type',
					name: 'type',
					value: this.state.type,
					onChange: this.handleChange,
				}, [
					elem('option', {key: 'A', value: 'A'}, 'A'),
					elem('option', {key: 'AAAA', value: 'AAAA'}, 'AAAA'),
					elem('option', {key: 'CNAME', value: 'CNAME'}, 'CNAME'),
					elem('option', {key: 'TXT', value: 'TXT'}, 'TXT'),
				]),
				elem('input', {
					key: 'content',
					type: 'text',
					placeholder: 'content',
					name: 'content',
					value: this.state.content,
					onChange: this.handleChange,
				}),
				elem('input', {
					key: 'ttl',
					type: 'number',
					name: 'ttl',
					value: this.state.ttl,
					onChange: this.handleChange,
				}),
				elem('input', {
					key: 'submit',
					type: 'submit',
					value: 'submit',
				}),
			])
		];
		if (this.state.sending) {
			children.push(elem('p', {key: 'load'}, 'Sending...'));
		}
		if (this.state.errorStatus) {
			let error = this.state.errorStatus
			if (this.state.errorBody) {
				error += ': ' + this.state.errorBody
			}
			children.push(elem('p', {key: 'err'}, error));
		}
		return elem('div', null, children);
	}
}

class Shorturls extends React.PureComponent {
	constructor() {
		super();
		this.state = {
			updateToggle: false,
		};
		this.forceUpdate = this.forceUpdate.bind(this);
	}

	forceUpdate() {
		this.setState({
			updateToggle: !this.state.updateToggle,
		});
	}

	render() {
		return elem('div', null, [
			elem(ShorturlList, {
				key: 'list',
				apiKey: this.props.apiKey,
				updateToggle: this.state.updateToggle,
			}),
			elem(ShorturlForm, {
				key: 'form',
				apiKey: this.props.apiKey,
				update: this.forceUpdate,
			}),
		]);
	}
}

class ShorturlList extends React.PureComponent {
	constructor(props) {
		super(props);
		this.state = {
			loading: false,
			error: false,
			slugs: [],
		};
		this.fetchSlugs = this.fetchSlugs.bind(this);
	}

	fetchSlugs() {
		this.setState({
			loading: true,
		});
		fetch('http://localhost:8000/surl/api', {
			headers: {
				'X-API-Key': this.props.apiKey,
			},
		})
			.then((res) => res.json())
			.then((json) => this.setState({
				loading: false,
				slugs: json
			}));
	}

	componentDidMount() {
		this.fetchSlugs();
	}

	componentDidUpdate(prevProps) {
		if (
			this.props.apiKey !== prevProps.apiKey ||
			this.props.updateToggle !== prevProps.updateToggle
		)
			this.fetchSlugs();
	}

	render() {
		if (this.state.loading) {
			return 'Loading...';
		}

		if (this.state.error) {
			return 'Error';
		}

		return elem('table', null, elem(
			'tbody', null,
			this.state.slugs.map((slug) =>
				elem(Shorturl, {...slug, key: slug['slug']})
			))
		);
	}
}

class Shorturl extends React.PureComponent {
	render() {
		const {slug, target} = this.props;
		return elem('tr', null, [
			elem('td', {key: 'slug'}, slug),
			elem('td', {key: 'target'}, target),
		]);
	}
}

class ShorturlForm extends React.PureComponent {
	constructor(props) {
		super(props);
		this.formDefault = {
			slug: '',
			target: '',
		};
		this.state = {
			...this.formDefault,
			sending: false,
			errorStatus: null,
			errorBody: null,
		};

		this.handleChange = this.handleChange.bind(this);
		this.submit = this.submit.bind(this);
	}

	handleChange(event) {
		this.setState({
			[event.target.name]: event.target.value
		});
	}

	submit(event) {
		event.preventDefault();

		this.setState({
			sending: true,
			errorStatus: null,
			errorBody: null,
		});

		const {slug, target} = this.state;

		const data = {
			target,
		};
		fetch(`http://localhost:8000/surl/api/${slug}`, {
			method: 'PUT',
			headers: {
				'X-API-Key': this.props.apiKey,
			},
			body: JSON.stringify(data),
		})
			.then((res) => {
				if (!res.ok) {
					this.setState({
						sending: false,
						errorStatus: res.status,
					});
					res.json().then((json) =>
						this.setState({
							errorBody: json['error'],
						})
					);
				} else {
					this.setState({
						...this.formDefault,
						sending: false,
						errorStatus: null,
						errorBody: null,
					});
					this.props.update();
				}
			});
	}

	render() {
		const children = [
			elem('form', {key: 'frm', onSubmit: this.submit}, [
				elem('input', {
					key: 'slug',
					type: 'text',
					placeholder: 'slug',
					name: 'slug',
					value: this.state.slug,
					onChange: this.handleChange,
				}),
				elem('input', {
					key: 'target',
					type: 'text',
					placeholder: 'target',
					name: 'target',
					value: this.state.target,
					onChange: this.handleChange,
				}),
				elem('input', {
					key: 'submit',
					type: 'submit',
					value: 'submit',
				}),
			])
		];
		if (this.state.sending) {
			children.push(elem('p', {key: 'load'}, 'Sending...'));
		}
		if (this.state.errorStatus) {
			let error = this.state.errorStatus
			if (this.state.errorBody) {
				error += ': ' + this.state.errorBody
			}
			children.push(elem('p', {key: 'err'}, error));
		}
		return elem('div', null, children);
	}
}

const domContainer = document.querySelector('#react-container');
ReactDOM.render(elem(Password), domContainer);
